/**
 * Test Suite: stream.ts (the /proxy route)
 *
 * The contract under test is docs/proxy-contract.md. The proxy runs against a
 * real HTTP server standing in for googlevideo.com, so streaming, transparent
 * decompression, connection reuse and aborts all go through the same undici
 * client as production. Abort tests assert on the upstream side: what matters is
 * that googlevideo sees the connection close, not just that the client stopped.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import {
	FORWARDED_RESPONSE_HEADERS,
	UPSTREAM_REQUEST_HEADERS,
	isAllowedUpstreamHost,
	proxyStream,
	type StreamProxyOptions
} from './stream';
import {
	dripBytes,
	holdHeaders,
	replay,
	serveBytes,
	startFakeUpstream,
	testBytes,
	type FakeUpstream,
	type ProxyFixture
} from '../../../tests/helpers/fakeUpstream';

const GV_HOST = 'rr3---sn-aigl6nes.googlevideo.com';
const OTHER_GV_HOST = 'rr1---sn-5hne6nsr.googlevideo.com';

let upstream: FakeUpstream;

beforeAll(async () => {
	upstream = await startFakeUpstream();
});

afterAll(async () => {
	await upstream.close();
});

beforeEach(() => {
	upstream.reset();
});

/**
 * Proxy options pointing every googlevideo host at the fake upstream, recording
 * which host the proxy chose and every URL it fetched.
 */
function setup(overrides: StreamProxyOptions = {}) {
	const requestedHosts: string[] = [];
	const fetchedUrls: URL[] = [];
	const options: StreamProxyOptions = {
		upstreamOrigin: (host: string) => {
			requestedHosts.push(host);
			return upstream.origin;
		},
		fetch: (url: URL, init: RequestInit) => {
			fetchedUrls.push(url);
			return globalThis.fetch(url, init);
		},
		...overrides
	};
	return { options, requestedHosts, fetchedUrls };
}

function proxyRequest(query: string, init: RequestInit & { path?: string } = {}): Request {
	const { path = '/videoplayback', ...rest } = init;
	return new Request(`http://opentube.local/proxy${path}?${query}`, rest);
}

const hostParam = (host: string = GV_HOST): string => `host=${encodeURIComponent(host)}`;

async function bytesOf(res: Response): Promise<Uint8Array> {
	return new Uint8Array(await res.arrayBuffer());
}

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => Buffer.from(a).equals(Buffer.from(b));

/** Rejects with `message` if `promise` hasn't settled in `ms`. */
function within<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_resolve, reject) => {
		timer = setTimeout(() => reject(new Error(message)), ms);
	});
	return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function waitFor(condition: () => boolean, message: string): Promise<void> {
	const deadline = Date.now() + 2000;
	while (!condition()) {
		if (Date.now() > deadline) throw new Error(message);
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
}

async function readAll(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<number> {
	let total = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) return total;
		total += value.byteLength;
	}
}

// ---------------------------------------------------------------------------

describe('recorded googlevideo exchanges', () => {
	const fixtureDir = new URL('../../../tests/fixtures/proxy/', import.meta.url);
	const fixtures: ProxyFixture[] = readdirSync(fixtureDir)
		.filter((name: string) => name.endsWith('.json'))
		.sort()
		.map((name: string) => JSON.parse(readFileSync(new URL(name, fixtureDir), 'utf8')));

	it('has at least two exchanges to replay (one segment, one ranged)', () => {
		expect(fixtures.length).toBeGreaterThanOrEqual(2);
	});

	it.each(fixtures.map((fixture: ProxyFixture) => [fixture.description, fixture] as const))(
		'replays faithfully: %s',
		async (_description: string, fixture: ProxyFixture) => {
			const expected = new Uint8Array(Buffer.from(fixture.upstream.bodyBase64, 'base64'));
			expect(expected.length, 'fixture body does not match its content-length').toBe(
				Number(fixture.upstream.headers['content-length'])
			);

			const { options } = setup();
			upstream.handle(replay(fixture));
			const range = fixture.request.range ? `&range=${fixture.request.range}` : '';

			const res = await proxyStream(
				proxyRequest(`${fixture.request.query}&${hostParam()}${range}`, {
					path: fixture.request.path
				}),
				options
			);

			expect(res.status).toBe(fixture.upstream.status);
			for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
				expect(res.headers.get(name)).toBe(fixture.upstream.headers[name] ?? null);
			}
			expect(sameBytes(await bytesOf(res), expected)).toBe(true);

			const [exchange] = upstream.exchanges;
			expect(exchange.url).toBe(`${fixture.request.path}?${fixture.request.query}`);
			expect(exchange.headers.range).toBe(
				fixture.request.range ? `bytes=${fixture.request.range}` : undefined
			);
		}
	);
});

describe('full-body requests', () => {
	it('returns 200 with the body streamed through unchanged', async () => {
		const { options } = setup();
		const body = testBytes(1024 * 1024);
		upstream.handle(serveBytes(body));

		const res = await proxyStream(proxyRequest(`id=abc&${hostParam()}`), options);

		expect(res.status).toBe(200);
		expect(res.headers.get('content-length')).toBe(String(body.length));
		expect(res.headers.get('content-range')).toBeNull();
		expect(sameBytes(await bytesOf(res), body)).toBe(true);
		expect(upstream.exchanges[0].headers.range).toBeUndefined();
	});

	it('hands back the stream before the upstream body has finished (never buffers)', async () => {
		const { options } = setup();
		const body = testBytes(256 * 1024);
		const drip = dripBytes(body, 16 * 1024);
		upstream.handle(drip.handler);

		const res = await within(
			proxyStream(proxyRequest(hostParam()), options),
			2000,
			'proxy did not return until the upstream body finished, so it is buffering'
		);
		const reader = (res.body as ReadableStream<Uint8Array>).getReader();
		const first = await within(reader.read(), 2000, 'first chunk never arrived');

		expect(first.done).toBe(false);
		expect(first.value?.byteLength).toBeGreaterThan(0);

		drip.release();
		const rest = await readAll(reader);
		expect((first.value?.byteLength ?? 0) + rest).toBe(body.length);
	});
});

describe('ranged requests', () => {
	const body = testBytes(1000);

	it('returns 206, not 200, with Content-Range, Content-Length and Accept-Ranges verbatim', async () => {
		const { options } = setup();
		upstream.handle(serveBytes(body));

		const res = await proxyStream(proxyRequest(`${hostParam()}&range=100-199`), options);

		expect(res.status).toBe(206);
		expect(res.headers.get('content-range')).toBe('bytes 100-199/1000');
		expect(res.headers.get('content-length')).toBe('100');
		expect(res.headers.get('accept-ranges')).toBe('bytes');
		expect(sameBytes(await bytesOf(res), body.subarray(100, 200))).toBe(true);
	});

	it.each([
		['0-0', 'bytes=0-0'],
		['0-740', 'bytes=0-740'],
		['500-', 'bytes=500-'],
		['-200', 'bytes=-200'],
		['1249781-1253876', 'bytes=1249781-1253876']
	])('converts range=%s into the upstream header %s', async (param: string, header: string) => {
		const { options } = setup();
		upstream.handle(serveBytes(testBytes(2_000_000)));

		const res = await proxyStream(proxyRequest(`${hostParam()}&range=${param}`), options);
		await res.arrayBuffer();

		expect(upstream.exchanges[0].headers.range).toBe(header);
	});

	it('honours a Range header when there is no range param (native <video> element)', async () => {
		const { options } = setup();
		upstream.handle(serveBytes(body));

		const res = await proxyStream(
			proxyRequest(hostParam(), { headers: { range: 'bytes=10-19' } }),
			options
		);

		expect(res.status).toBe(206);
		expect(res.headers.get('content-range')).toBe('bytes 10-19/1000');
		expect(upstream.exchanges[0].headers.range).toBe('bytes=10-19');
	});

	it('prefers the range param over a Range header', async () => {
		const { options } = setup();
		upstream.handle(serveBytes(body));

		const res = await proxyStream(
			proxyRequest(`${hostParam()}&range=0-9`, { headers: { range: 'bytes=500-599' } }),
			options
		);
		await res.arrayBuffer();

		expect(upstream.exchanges[0].headers.range).toBe('bytes=0-9');
	});

	it.each(['bytes=0-1,5-9', 'items=0-5', 'bytes=abc'])(
		'ignores the malformed Range header %s and requests the full body',
		async (header: string) => {
			const { options } = setup();
			upstream.handle(serveBytes(body));

			const res = await proxyStream(
				proxyRequest(hostParam(), { headers: { range: header } }),
				options
			);
			await res.arrayBuffer();

			expect(res.status).toBe(200);
			expect(upstream.exchanges[0].headers.range).toBeUndefined();
		}
	);

	it('treats an empty range param as no range', async () => {
		const { options } = setup();
		upstream.handle(serveBytes(body));

		const res = await proxyStream(proxyRequest(`${hostParam()}&range=`), options);
		await res.arrayBuffer();

		expect(res.status).toBe(200);
		expect(upstream.exchanges[0].headers.range).toBeUndefined();
	});

	it.each([
		['abc', 400],
		['1-2-3', 400],
		['0-1,5-9', 400],
		['bytes=0-1', 400],
		['-', 400],
		[' 0-1', 400],
		['99999999999999999999-', 400],
		['10-5', 416],
		['-0', 416]
	])(
		'answers the malformed range=%s with %i, without a network call',
		async (range: string, status: number) => {
			const { options, fetchedUrls } = setup();

			const res = await proxyStream(
				proxyRequest(`${hostParam()}&range=${encodeURIComponent(range)}`),
				options
			);

			expect(res.status).toBe(status);
			expect(res.headers.get('x-proxy-error')).toBe('invalid-range');
			expect(fetchedUrls).toHaveLength(0);
			expect(upstream.exchanges).toHaveLength(0);
		}
	);
});

describe('response headers', () => {
	it('strips Content-Encoding and the encoded Content-Length when upstream compresses anyway', async () => {
		const { options } = setup();
		const text = 'not actually video, but compressible '.repeat(200);
		const compressed = gzipSync(text);
		upstream.handle((_req, res) => {
			res.writeHead(200, {
				'content-type': 'video/mp4',
				'content-encoding': 'gzip',
				'content-length': String(compressed.length)
			});
			res.end(compressed);
		});

		const res = await proxyStream(proxyRequest(hostParam()), options);

		expect(res.headers.get('content-encoding')).toBeNull();
		expect(res.headers.get('content-length')).toBeNull();
		expect(await res.text()).toBe(text);
		expect(upstream.exchanges[0].headers['accept-encoding']).toBe('identity');
	});

	it('strips hop-by-hop headers', async () => {
		const { options } = setup();
		upstream.handle((_req, res) => {
			res.writeHead(200, {
				'content-type': 'video/mp4',
				connection: 'keep-alive',
				'keep-alive': 'timeout=5, max=1000',
				'transfer-encoding': 'chunked'
			});
			res.write('chunk one ');
			res.end('chunk two');
		});

		const res = await proxyStream(proxyRequest(hostParam()), options);

		expect(await res.text()).toBe('chunk one chunk two');
		for (const name of ['connection', 'keep-alive', 'transfer-encoding']) {
			expect(res.headers.get(name)).toBeNull();
		}
	});

	it('strips upstream CORS headers and anything else not on the allowlist', async () => {
		const { options } = setup();
		upstream.handle(
			serveBytes(testBytes(100), {
				'access-control-allow-origin': 'https://www.youtube.com',
				'access-control-allow-credentials': 'true',
				'access-control-expose-headers': 'Content-Length, X-Bandwidth-Est',
				'timing-allow-origin': 'https://www.youtube.com',
				'set-cookie': 'YSC=abc; Domain=.youtube.com',
				'alt-svc': 'h3=":443"; ma=2592000',
				server: 'gvs 1.0',
				vary: 'Origin',
				'cache-control': 'private, max-age=21299',
				'last-modified': 'Tue, 14 Nov 2023 22:13:20 GMT'
			})
		);

		const res = await proxyStream(proxyRequest(hostParam()), options);
		await res.arrayBuffer();

		const names = [...res.headers.keys()];
		const allowed = new Set([...FORWARDED_RESPONSE_HEADERS, 'x-upstream-status', 'server-timing']);
		expect(names.filter((name: string) => !allowed.has(name))).toEqual([]);
		expect(names.some((name: string) => name.startsWith('access-control-'))).toBe(false);
		expect(res.headers.get('cache-control')).toBe('private, max-age=21299');
		expect(res.headers.get('last-modified')).toBe('Tue, 14 Nov 2023 22:13:20 GMT');
	});

	it('reports the upstream status and time to headers', async () => {
		const { options } = setup();
		upstream.handle(serveBytes(testBytes(100)));

		const res = await proxyStream(proxyRequest(`${hostParam()}&range=0-9`), options);
		await res.arrayBuffer();

		expect(res.headers.get('x-upstream-status')).toBe('206');
		expect(res.headers.get('server-timing')).toMatch(/^upstream;dur=\d$/);
	});
});

describe('upstream errors', () => {
	it.each([403, 404, 410, 416, 500, 503])(
		'passes upstream %i through as a defined plain-text response',
		async (status: number) => {
			const { options } = setup();
			upstream.handle((_req, res) => {
				res.writeHead(status, { 'content-type': 'text/html', 'set-cookie': 'x=1' });
				res.end('<html>upstream error page with internal details</html>');
			});

			const res = await proxyStream(proxyRequest(hostParam()), options);
			const text = await res.text();

			expect(res.status).toBe(status);
			expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
			expect(res.headers.get('x-upstream-status')).toBe(String(status));
			expect(res.headers.get('set-cookie')).toBeNull();
			expect(text).toBe(`Upstream responded ${status}`);
		}
	);

	it('returns 502 without throwing when the upstream connection fails', async () => {
		const closed = createServer();
		await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
		const { port } = closed.address() as AddressInfo;
		await new Promise<void>((resolve) => closed.close(() => resolve()));
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { options } = setup({ upstreamOrigin: () => `http://127.0.0.1:${port}` });

		const res = await proxyStream(proxyRequest(`sig=SECRET&${hostParam()}`), options);

		expect(res.status).toBe(502);
		expect(res.headers.get('x-proxy-error')).toBe('unreachable');
		expect(warn).toHaveBeenCalled();
		expect(JSON.stringify(warn.mock.calls)).not.toContain('SECRET');
	});

	it('returns 504 and abandons the upstream request when headers take too long', async () => {
		const { options } = setup({ headersTimeoutMs: 100 });
		const hold = holdHeaders(serveBytes(testBytes(100)));
		upstream.handle(hold.handler);

		const res = await proxyStream(proxyRequest(hostParam()), options);

		expect(res.status).toBe(504);
		expect(res.headers.get('x-proxy-error')).toBe('timeout');
		await waitFor(() => upstream.exchanges.length === 1, 'upstream never saw the request');
		expect(await within(upstream.exchanges[0].outcome, 2000, 'upstream request left open')).toBe(
			'client-disconnected'
		);
		hold.release();
	});

	it('does not apply the headers timeout to a slow body', async () => {
		const { options } = setup({ headersTimeoutMs: 100 });
		const body = testBytes(64 * 1024);
		const drip = dripBytes(body, 1024);
		upstream.handle(drip.handler);

		const res = await proxyStream(proxyRequest(hostParam()), options);
		setTimeout(() => drip.release(), 300);

		expect(res.status).toBe(200);
		expect(sameBytes(await bytesOf(res), body)).toBe(true);
	});
});

describe('redirects', () => {
	it('follows a redirect to another googlevideo host, keeping the range', async () => {
		const { options, requestedHosts } = setup();
		const serve = serveBytes(testBytes(1000));
		upstream.handle((req, res) => {
			if (upstream.exchanges.length === 1) {
				res.writeHead(302, { location: `https://${OTHER_GV_HOST}/videoplayback?moved=1` });
				res.end();
				return;
			}
			return serve(req, res);
		});

		const res = await proxyStream(proxyRequest(`${hostParam()}&range=0-99`), options);
		await res.arrayBuffer();

		expect(res.status).toBe(206);
		expect(requestedHosts).toEqual([GV_HOST, OTHER_GV_HOST]);
		expect(upstream.exchanges[1].url).toBe('/videoplayback?moved=1');
		expect(upstream.exchanges[1].headers.range).toBe('bytes=0-99');
	});

	it.each([
		['an off-googlevideo host', 'https://evil.example/steal'],
		['plain http', `http://${OTHER_GV_HOST}/videoplayback`],
		['a googlevideo host with a port', `https://${OTHER_GV_HOST}:8443/videoplayback`]
	])('refuses a redirect to %s without following it', async (_label: string, location: string) => {
		const { options, requestedHosts } = setup();
		upstream.handle((_req, res) => {
			res.writeHead(302, { location });
			res.end();
		});

		const res = await proxyStream(proxyRequest(hostParam()), options);

		expect(res.status).toBe(502);
		expect(res.headers.get('x-proxy-error')).toBe('redirect');
		expect(res.headers.get('location')).toBeNull();
		expect(requestedHosts).toEqual([GV_HOST]);
		expect(upstream.exchanges).toHaveLength(1);
	});

	it('gives up after three redirects', async () => {
		const { options } = setup();
		upstream.handle((_req, res) => {
			res.writeHead(302, { location: '/videoplayback?again=1' });
			res.end();
		});

		const res = await proxyStream(proxyRequest(hostParam()), options);

		expect(res.status).toBe(502);
		expect(res.headers.get('x-proxy-error')).toBe('redirect');
		expect(upstream.exchanges).toHaveLength(4);
	});
});

describe('client aborts propagate upstream', () => {
	it('closes the upstream request when the client leaves before headers arrive', async () => {
		const { options } = setup();
		const hold = holdHeaders(serveBytes(testBytes(100)));
		upstream.handle(hold.handler);
		const controller = new AbortController();

		const pending = proxyStream(proxyRequest(hostParam(), { signal: controller.signal }), options);
		await waitFor(() => upstream.exchanges.length === 1, 'upstream never saw the request');
		controller.abort();
		const res = await pending;

		expect(res.status).toBe(499);
		expect(await within(upstream.exchanges[0].outcome, 2000, 'upstream request left open')).toBe(
			'client-disconnected'
		);
		hold.release();
	});

	it('closes the upstream download when the client disconnects mid-body', async () => {
		const { options } = setup();
		const drip = dripBytes(testBytes(256 * 1024), 16 * 1024);
		upstream.handle(drip.handler);
		const controller = new AbortController();

		const res = await proxyStream(
			proxyRequest(hostParam(), { signal: controller.signal }),
			options
		);
		const reader = (res.body as ReadableStream<Uint8Array>).getReader();
		await reader.read();
		controller.abort();

		expect(await within(upstream.exchanges[0].outcome, 2000, 'upstream download left open')).toBe(
			'client-disconnected'
		);
		drip.release();
		await reader.read().catch(() => undefined);
	});

	it('closes the upstream download when the response stream is cancelled', async () => {
		const { options } = setup();
		const drip = dripBytes(testBytes(256 * 1024), 16 * 1024);
		upstream.handle(drip.handler);

		const res = await proxyStream(proxyRequest(hostParam()), options);
		const reader = (res.body as ReadableStream<Uint8Array>).getReader();
		await reader.read();
		await reader.cancel();

		expect(await within(upstream.exchanges[0].outcome, 2000, 'upstream download left open')).toBe(
			'client-disconnected'
		);
		drip.release();
	});
});

describe('request validation', () => {
	it.each([
		['(missing)', null, 'missing-host'],
		['(empty)', '', 'missing-host'],
		['example.com', 'example.com', 'invalid-host'],
		['googlevideo.com', 'googlevideo.com', 'invalid-host'],
		['googlevideo.com.evil.example', 'googlevideo.com.evil.example', 'invalid-host'],
		['evil.example#.googlevideo.com', 'evil.example#.googlevideo.com', 'invalid-host'],
		['evil.example/.googlevideo.com', 'evil.example/.googlevideo.com', 'invalid-host'],
		['user@rr3.googlevideo.com', 'user@rr3.googlevideo.com', 'invalid-host'],
		['rr3.googlevideo.com:8443', 'rr3.googlevideo.com:8443', 'invalid-host'],
		['rr3.googlevideo.com.', 'rr3.googlevideo.com.', 'invalid-host'],
		['-rr3.googlevideo.com', '-rr3.googlevideo.com', 'invalid-host'],
		['rr3..googlevideo.com', 'rr3..googlevideo.com', 'invalid-host'],
		['127.0.0.1', '127.0.0.1', 'invalid-host']
	])(
		'rejects host %s with 400 and no network call',
		async (_label: string, host: string | null, error: string) => {
			const { options, fetchedUrls } = setup();
			const query = host === null ? 'id=abc' : `id=abc&${hostParam(host)}`;

			const res = await proxyStream(proxyRequest(query), options);

			expect(res.status).toBe(400);
			expect(res.headers.get('x-proxy-error')).toBe(error);
			expect(fetchedUrls).toHaveLength(0);
			expect(upstream.exchanges).toHaveLength(0);
		}
	);

	it.each([GV_HOST, 'r4---sn-4g5edndl.googlevideo.com', 'redirector.googlevideo.com'])(
		'accepts the googlevideo host %s',
		(host: string) => {
			expect(isAllowedUpstreamHost(host)).toBe(true);
		}
	);

	it('lowercases the host before validating and fetching', async () => {
		const { options, requestedHosts } = setup();
		upstream.handle(serveBytes(testBytes(10)));

		const res = await proxyStream(proxyRequest(hostParam(GV_HOST.toUpperCase())), options);
		await res.arrayBuffer();

		expect(res.status).toBe(200);
		expect(requestedHosts).toEqual([GV_HOST]);
	});

	it('keeps a protocol-relative-looking path on the upstream host', async () => {
		const { options, fetchedUrls, requestedHosts } = setup();
		upstream.handle(serveBytes(testBytes(10)));

		const res = await proxyStream(
			proxyRequest(hostParam(), { path: '//evil.example/videoplayback' }),
			options
		);
		await res.arrayBuffer();

		expect(requestedHosts).toEqual([GV_HOST]);
		expect(fetchedUrls[0].origin).toBe(upstream.origin);
		expect(upstream.exchanges[0].url.startsWith('//evil.example/videoplayback')).toBe(true);
	});

	it('forwards the query byte-for-byte and in order, minus host and range', async () => {
		const { options } = setup();
		upstream.handle(serveBytes(testBytes(10)));

		const res = await proxyStream(
			proxyRequest(`a=1&${hostParam()}&sig=AJ%3D%3D&range=0-1&sparams=x%2Cy&z=&mime=video%2Fmp4`),
			options
		);
		await res.arrayBuffer();

		expect(upstream.exchanges[0].url).toBe(
			'/videoplayback?a=1&sig=AJ%3D%3D&sparams=x%2Cy&z=&mime=video%2Fmp4'
		);
	});

	it('sends the synthesised YouTube headers and nothing from the client', async () => {
		const { options } = setup();
		upstream.handle(serveBytes(testBytes(10)));

		const res = await proxyStream(
			proxyRequest(hostParam(), {
				headers: {
					cookie: 'session=secret',
					authorization: 'Bearer secret',
					'user-agent': 'client-browser',
					referer: 'http://opentube.local/video/abc'
				}
			}),
			options
		);
		await res.arrayBuffer();

		const sent = upstream.exchanges[0].headers;
		for (const [name, value] of Object.entries(UPSTREAM_REQUEST_HEADERS)) {
			expect(sent[name]).toBe(value);
		}
		expect(sent.cookie).toBeUndefined();
		expect(sent.authorization).toBeUndefined();
	});
});
