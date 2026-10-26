/**
 * Test Suite: forward.ts (the /api route)
 *
 * The forwarder runs against a real HTTP server standing in for the backend, so
 * streaming, transparent decompression and aborts all go through the same undici
 * client as production.
 */

import { gzipSync } from 'node:zlib';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import {
	FORWARDED_RESPONSE_HEADERS,
	forwardToBackend,
	parseBackendUrl,
	type ApiForwardOptions
} from './forward';
import {
	dripBytes,
	holdHeaders,
	serveBytes,
	startFakeUpstream,
	testBytes,
	type FakeUpstream,
	type UpstreamHandler
} from '../../../tests/helpers/fakeUpstream';

let backend: FakeUpstream;

beforeAll(async () => {
	backend = await startFakeUpstream();
});

afterAll(async () => {
	await backend.close();
});

beforeEach(() => {
	backend.reset();
});

/** Forwarder options pointing at the fake backend, recording every URL fetched. */
function setup(overrides: Partial<ApiForwardOptions> = {}) {
	const fetchedUrls: URL[] = [];
	const options: ApiForwardOptions = {
		backendUrl: backend.origin,
		fetch: (url: URL, init: RequestInit) => {
			fetchedUrls.push(url);
			return globalThis.fetch(url, init);
		},
		...overrides
	};
	return { options, fetchedUrls };
}

function apiRequest(pathAndQuery: string, init: RequestInit = {}): Request {
	return new Request(`http://opentube.local${pathAndQuery}`, init);
}

function json(status: number, body: unknown, extra: Record<string, string> = {}): UpstreamHandler {
	return (_req, res) => {
		res.writeHead(status, { 'content-type': 'application/json', ...extra });
		res.end(JSON.stringify(body));
	};
}

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => Buffer.from(a).equals(Buffer.from(b));

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

describe('request forwarding', () => {
	it('returns the backend JSON with its status and content type', async () => {
		const { options } = setup();
		backend.handle(json(200, { id: 'abc', name: 'A video' }));

		const res = await forwardToBackend(apiRequest('/api/streams/details?id=abc'), options);

		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toBe('application/json');
		expect(await res.json()).toEqual({ id: 'abc', name: 'A video' });
		expect(backend.exchanges[0].method).toBe('GET');
	});

	it.each([
		['/api/streams/details?id=abc'],
		['/api/kiosks/trending_music'],
		['/api/search?searchString=lo-fi%20beats%20%26%20rain&sortFilter=asc'],
		[
			'/api/channels/tab/page?channelId=UC1&tab=videos&pageIds=Name&pageIds=https://www.youtube.com/channel/UC1&pageIds=%7B%22v%22%3A1%7D'
		],
		['/api/streams/dash?id=a%2Fb&z=&a=1']
	])('keeps the path and query unchanged: %s', async (pathAndQuery: string) => {
		const { options } = setup();
		backend.handle(json(200, {}));

		const res = await forwardToBackend(apiRequest(pathAndQuery), options);
		await res.arrayBuffer();

		expect(backend.exchanges[0].url).toBe(pathAndQuery);
	});

	it.each([
		['a trailing slash', (origin: string) => `${origin}/`],
		['a path prefix', (origin: string) => `${origin}/backend`],
		['a path prefix with a trailing slash', (origin: string) => `${origin}/backend/`]
	])('joins a backend URL with %s', async (label: string, url: (origin: string) => string) => {
		const { options } = setup({ backendUrl: url(backend.origin) });
		backend.handle(json(200, {}));

		const res = await forwardToBackend(apiRequest('/api/comments?id=abc'), options);
		await res.arrayBuffer();

		const expected = label === 'a trailing slash' ? '' : '/backend';
		expect(backend.exchanges[0].url).toBe(`${expected}/api/comments?id=abc`);
	});

	it('sends a small allowlist of client headers plus X-Forwarded-For, never cookies or auth', async () => {
		const { options } = setup({ clientAddress: '203.0.113.7' });
		backend.handle(json(200, {}));

		const res = await forwardToBackend(
			apiRequest('/api/search?searchString=x', {
				headers: {
					accept: 'application/json',
					'accept-language': 'en-GB',
					cookie: 'session=secret',
					authorization: 'Bearer secret',
					'x-forwarded-for': '198.51.100.1',
					'user-agent': 'client-browser'
				}
			}),
			options
		);
		await res.arrayBuffer();

		const sent = backend.exchanges[0].headers;
		expect(sent.accept).toBe('application/json');
		expect(sent['accept-language']).toBe('en-GB');
		expect(sent['accept-encoding']).toBe('identity');
		expect(sent['x-forwarded-for']).toBe('198.51.100.1, 203.0.113.7');
		expect(sent.cookie).toBeUndefined();
		expect(sent.authorization).toBeUndefined();
		expect(sent['user-agent']).not.toBe('client-browser');
	});

	it('leaves out X-Forwarded-For when there is no client address to report', async () => {
		const { options } = setup();
		backend.handle(json(200, {}));

		const res = await forwardToBackend(apiRequest('/api/kiosks/trending_music'), options);
		await res.arrayBuffer();

		expect(backend.exchanges[0].headers['x-forwarded-for']).toBeUndefined();
	});
});

describe('streaming', () => {
	it('streams a large body through unchanged', async () => {
		const { options } = setup();
		const body = testBytes(1024 * 1024);
		backend.handle(serveBytes(body, { 'content-type': 'application/dash+xml' }));

		const res = await forwardToBackend(apiRequest('/api/streams/dash?id=abc'), options);

		expect(res.status).toBe(200);
		expect(res.headers.get('content-length')).toBe(String(body.length));
		expect(sameBytes(new Uint8Array(await res.arrayBuffer()), body)).toBe(true);
	});

	it('hands back the stream before the backend body has finished (never buffers)', async () => {
		const { options } = setup();
		const body = testBytes(256 * 1024);
		const drip = dripBytes(body, 16 * 1024);
		backend.handle(drip.handler);

		const res = await within(
			forwardToBackend(apiRequest('/api/streams/dash?id=abc'), options),
			2000,
			'forwarder did not return until the backend body finished, so it is buffering'
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

describe('status passthrough', () => {
	it.each([
		[200, { ok: true }],
		[400, { error: 'Bad Request', message: 'id is required' }],
		[404, { error: 'Not Found' }],
		[429, { error: 'Too Many Requests' }],
		[500, { error: 'Internal Server Error' }],
		[503, { error: 'Service Unavailable' }]
	])('passes backend %i through with its body', async (status: number, body: object) => {
		const { options } = setup();
		backend.handle(json(status, body));

		const res = await forwardToBackend(apiRequest('/api/streams/details?id=abc'), options);

		expect(res.status).toBe(status);
		expect(res.headers.get('x-api-error')).toBeNull();
		expect(await res.json()).toEqual(body);
	});

	it('keeps the status text, which the API functions put in their error messages', async () => {
		const { options } = setup();
		backend.handle((_req, res) => {
			res.writeHead(404, 'Not Found', { 'content-type': 'application/json' });
			res.end('{}');
		});

		const res = await forwardToBackend(apiRequest('/api/playlists?id=PL1'), options);
		await res.arrayBuffer();

		expect(res.statusText).toBe('Not Found');
	});

	it.each([204, 304])('answers %i with no body', async (status: number) => {
		const { options } = setup();
		backend.handle((_req, res) => {
			res.writeHead(status, { etag: '"v1"' });
			res.end();
		});

		const res = await forwardToBackend(
			apiRequest('/api/kiosks/trending_music', { headers: { 'if-none-match': '"v1"' } }),
			options
		);

		expect(res.status).toBe(status);
		expect(res.body).toBeNull();
		expect(res.headers.get('etag')).toBe('"v1"');
		expect(backend.exchanges[0].headers['if-none-match']).toBe('"v1"');
	});

	it('refuses a backend redirect with 502, without following it or leaking Location', async () => {
		const { options, fetchedUrls } = setup();
		backend.handle((_req, res) => {
			res.writeHead(302, { location: 'http://internal-host:9999/elsewhere' });
			res.end();
		});

		const res = await forwardToBackend(apiRequest('/api/search?searchString=x'), options);

		expect(res.status).toBe(502);
		expect(res.headers.get('x-api-error')).toBe('redirect');
		expect(res.headers.get('location')).toBeNull();
		expect(fetchedUrls).toHaveLength(1);
		expect(backend.exchanges).toHaveLength(1);
	});
});

describe('response headers', () => {
	it('keeps the muxed fallback signal: text/uri-list and X-Stream-Type', async () => {
		const { options } = setup();
		backend.handle((_req, res) => {
			res.writeHead(200, {
				'content-type': 'text/uri-list',
				'x-stream-type': 'muxed-progressive'
			});
			res.end('https://rr3---sn-aigl6nes.googlevideo.com/videoplayback?itag=18\n');
		});

		const res = await forwardToBackend(apiRequest('/api/streams/dash?id=abc'), options);

		expect(res.headers.get('content-type')).toBe('text/uri-list');
		expect(res.headers.get('x-stream-type')).toBe('muxed-progressive');
		expect(await res.text()).toContain('videoplayback?itag=18');
	});

	it('strips Content-Encoding and the encoded Content-Length when the backend compresses anyway', async () => {
		const { options } = setup();
		const text = JSON.stringify({ items: Array(200).fill('compressible') });
		const compressed = gzipSync(text);
		backend.handle((_req, res) => {
			res.writeHead(200, {
				'content-type': 'application/json',
				'content-encoding': 'gzip',
				'content-length': String(compressed.length)
			});
			res.end(compressed);
		});

		const res = await forwardToBackend(apiRequest('/api/search?searchString=x'), options);

		expect(res.headers.get('content-encoding')).toBeNull();
		expect(res.headers.get('content-length')).toBeNull();
		expect(await res.text()).toBe(text);
	});

	it('strips CORS, cookies, hop-by-hop and anything else not on the allowlist', async () => {
		const { options } = setup();
		backend.handle((_req, res) => {
			res.writeHead(200, {
				'content-type': 'application/json',
				'access-control-allow-origin': '*',
				'access-control-allow-credentials': 'true',
				vary: 'Origin, Access-Control-Request-Method',
				'set-cookie': 'JSESSIONID=abc; Path=/',
				connection: 'keep-alive',
				'keep-alive': 'timeout=60',
				'transfer-encoding': 'chunked',
				'x-application-context': 'newpipe-api:5050',
				'cache-control': 'max-age=300',
				'retry-after': '30'
			});
			res.write('{"a":');
			res.end('1}');
		});

		const res = await forwardToBackend(apiRequest('/api/kiosks/trending_music'), options);

		expect(await res.json()).toEqual({ a: 1 });
		const allowed = new Set([...FORWARDED_RESPONSE_HEADERS, 'server-timing']);
		expect([...res.headers.keys()].filter((name: string) => !allowed.has(name))).toEqual([]);
		expect(res.headers.get('cache-control')).toBe('max-age=300');
		expect(res.headers.get('retry-after')).toBe('30');
	});

	it('reports the time to backend headers', async () => {
		const { options } = setup();
		backend.handle(json(200, {}));

		const res = await forwardToBackend(apiRequest('/api/kiosks/trending_music'), options);
		await res.arrayBuffer();

		expect(res.headers.get('server-timing')).toMatch(/^backend;dur=\d+$/);
	});
});

describe('backend failures', () => {
	it('returns 502 without throwing, and without logging the query, when the backend is down', async () => {
		const closed = createServer();
		await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
		const { port } = closed.address() as AddressInfo;
		await new Promise<void>((resolve) => closed.close(() => resolve()));
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { options } = setup({ backendUrl: `http://127.0.0.1:${port}` });

		const res = await forwardToBackend(
			apiRequest('/api/search?searchString=PRIVATE-SEARCH'),
			options
		);

		expect(res.status).toBe(502);
		expect(res.headers.get('x-api-error')).toBe('unreachable');
		expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
		expect(warn).toHaveBeenCalled();
		expect(JSON.stringify(warn.mock.calls)).not.toContain('PRIVATE-SEARCH');
	});

	it('returns 504 and abandons the backend request when headers take too long', async () => {
		const { options } = setup({ headersTimeoutMs: 100 });
		const hold = holdHeaders(json(200, {}));
		backend.handle(hold.handler);

		const res = await forwardToBackend(apiRequest('/api/streams/dash?id=abc'), options);

		expect(res.status).toBe(504);
		expect(res.headers.get('x-api-error')).toBe('timeout');
		await waitFor(() => backend.exchanges.length === 1, 'backend never saw the request');
		expect(await within(backend.exchanges[0].outcome, 2000, 'backend request left open')).toBe(
			'client-disconnected'
		);
		hold.release();
	});

	it('does not apply the headers timeout to a slow body', async () => {
		const { options } = setup({ headersTimeoutMs: 100 });
		const body = testBytes(64 * 1024);
		const drip = dripBytes(body, 1024);
		backend.handle(drip.handler);

		const res = await forwardToBackend(apiRequest('/api/streams/dash?id=abc'), options);
		setTimeout(() => drip.release(), 300);

		expect(res.status).toBe(200);
		expect(sameBytes(new Uint8Array(await res.arrayBuffer()), body)).toBe(true);
	});
});

describe('client aborts propagate to the backend', () => {
	it('closes the backend request when the client leaves before headers arrive', async () => {
		const { options } = setup();
		const hold = holdHeaders(json(200, {}));
		backend.handle(hold.handler);
		const controller = new AbortController();

		const pending = forwardToBackend(
			apiRequest('/api/streams/details?id=abc', { signal: controller.signal }),
			options
		);
		await waitFor(() => backend.exchanges.length === 1, 'backend never saw the request');
		controller.abort();
		const res = await pending;

		expect(res.status).toBe(499);
		expect(await within(backend.exchanges[0].outcome, 2000, 'backend request left open')).toBe(
			'client-disconnected'
		);
		hold.release();
	});

	it('closes the backend response when the client disconnects mid-body', async () => {
		const { options } = setup();
		const drip = dripBytes(testBytes(256 * 1024), 16 * 1024);
		backend.handle(drip.handler);
		const controller = new AbortController();

		const res = await forwardToBackend(
			apiRequest('/api/streams/dash?id=abc', { signal: controller.signal }),
			options
		);
		const reader = (res.body as ReadableStream<Uint8Array>).getReader();
		await reader.read();
		controller.abort();

		expect(await within(backend.exchanges[0].outcome, 2000, 'backend response left open')).toBe(
			'client-disconnected'
		);
		drip.release();
		await reader.read().catch(() => undefined);
	});

	it('closes the backend response when the response stream is cancelled', async () => {
		const { options } = setup();
		const drip = dripBytes(testBytes(256 * 1024), 16 * 1024);
		backend.handle(drip.handler);

		const res = await forwardToBackend(apiRequest('/api/streams/dash?id=abc'), options);
		const reader = (res.body as ReadableStream<Uint8Array>).getReader();
		await reader.read();
		await reader.cancel();

		expect(await within(backend.exchanges[0].outcome, 2000, 'backend response left open')).toBe(
			'client-disconnected'
		);
		drip.release();
	});
});

describe('request validation', () => {
	it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])(
		'rejects %s with 405 and no network call',
		async (method: string) => {
			const { options, fetchedUrls } = setup();

			const res = await forwardToBackend(
				apiRequest('/api/search?searchString=x', { method }),
				options
			);

			expect(res.status).toBe(405);
			expect(res.headers.get('allow')).toBe('GET');
			expect(fetchedUrls).toHaveLength(0);
			expect(backend.exchanges).toHaveLength(0);
		}
	);

	it.each([['/apiary/x'], ['/proxy/videoplayback'], ['/']])(
		'refuses %s, which is outside /api, with no network call',
		async (path: string) => {
			const { options, fetchedUrls } = setup();

			const res = await forwardToBackend(apiRequest(path), options);

			expect(res.status).toBe(404);
			expect(fetchedUrls).toHaveLength(0);
		}
	);

	it.each([
		['unset', undefined],
		['empty', ''],
		['not a URL', 'backend:5050'],
		['a non-http scheme', 'ftp://backend:5050'],
		['carrying credentials', 'http://user:pass@backend:5050'],
		['carrying a query', 'http://backend:5050?x=1']
	])(
		'answers 500 with no network call when API_URL is %s',
		async (_label: string, backendUrl: string | undefined) => {
			const error = vi.spyOn(console, 'error').mockImplementation(() => {});
			const { options, fetchedUrls } = setup({ backendUrl });

			const res = await forwardToBackend(apiRequest('/api/kiosks/trending_music'), options);

			expect(res.status).toBe(500);
			expect(res.headers.get('x-api-error')).toBe('not-configured');
			expect(fetchedUrls).toHaveLength(0);
			expect(error).toHaveBeenCalled();
		}
	);

	it.each(['http://backend:5050', 'https://api.internal', ' http://backend:5050/ '])(
		'accepts the backend URL %s',
		(raw: string) => {
			expect(parseBackendUrl(raw)).not.toBeNull();
		}
	);
});
