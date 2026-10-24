/**
 * A scriptable stand-in for googlevideo.com, for the stream proxy tests.
 *
 * It is a real HTTP server on 127.0.0.1 rather than a fetch stub, so the proxy
 * is exercised through the same undici client it uses in production: transparent
 * decompression, connection reuse and abort behaviour all come from the real thing.
 * Every exchange is recorded, including whether the client hung up before the
 * response finished, which is how the abort tests assert on the upstream side.
 */

import {
	createServer,
	type IncomingHttpHeaders,
	type IncomingMessage,
	type Server,
	type ServerResponse
} from 'node:http';
import type { AddressInfo } from 'node:net';

export type UpstreamHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

export type ExchangeOutcome = 'completed' | 'client-disconnected';

export interface UpstreamExchange {
	method: string;
	/** Raw path and query exactly as the proxy sent them. */
	url: string;
	headers: IncomingHttpHeaders;
	/** Settles when the response closes: finished normally, or the client hung up first. */
	outcome: Promise<ExchangeOutcome>;
}

export interface FakeUpstream {
	readonly origin: string;
	readonly exchanges: UpstreamExchange[];
	handle(handler: UpstreamHandler): void;
	reset(): void;
	close(): Promise<void>;
}

const unhandled: UpstreamHandler = (_req, res) => {
	res.writeHead(500, { 'content-type': 'text/plain' });
	res.end('fake upstream: no handler set for this test');
};

export async function startFakeUpstream(): Promise<FakeUpstream> {
	let handler: UpstreamHandler = unhandled;
	const exchanges: UpstreamExchange[] = [];

	const server: Server = createServer((req, res) => {
		const outcome = new Promise<ExchangeOutcome>((resolve) => {
			res.once('close', () => resolve(res.writableFinished ? 'completed' : 'client-disconnected'));
		});
		exchanges.push({ method: req.method ?? '', url: req.url ?? '', headers: req.headers, outcome });

		Promise.resolve(handler(req, res)).catch((error: unknown) => {
			if (!res.headersSent) res.writeHead(500);
			res.end(String(error));
		});
	});

	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const { port } = server.address() as AddressInfo;

	return {
		origin: `http://127.0.0.1:${port}`,
		exchanges,
		handle(next: UpstreamHandler) {
			handler = next;
		},
		reset() {
			handler = unhandled;
			exchanges.length = 0;
		},
		close() {
			server.closeAllConnections();
			return new Promise<void>((resolve) => server.close(() => resolve()));
		}
	};
}

/** Deterministic, non-repeating-looking bytes, so a misplaced chunk shows up as a mismatch. */
export function testBytes(size: number, seed = 7): Uint8Array {
	const bytes = new Uint8Array(size);
	for (let i = 0; i < size; i++) bytes[i] = (i * 31 + seed + (i >> 8)) & 0xff;
	return bytes;
}

/**
 * Serves `body` the way googlevideo does: 206 with Content-Range for a satisfiable
 * single `bytes=` range, 416 for an unsatisfiable one, otherwise 200 with the full body.
 */
export function serveBytes(
	body: Uint8Array,
	extraHeaders: Record<string, string> = {}
): UpstreamHandler {
	return (req, res) => {
		const base = {
			'content-type': 'video/mp4',
			'accept-ranges': 'bytes',
			...extraHeaders
		};
		const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
		if (!match || (match[1] === '' && match[2] === '')) {
			res.writeHead(200, { ...base, 'content-length': String(body.length) });
			res.end(body);
			return;
		}

		let start: number;
		let end: number;
		if (match[1] === '') {
			start = Math.max(0, body.length - Number(match[2]));
			end = body.length - 1;
		} else {
			start = Number(match[1]);
			end = match[2] === '' ? body.length - 1 : Math.min(Number(match[2]), body.length - 1);
		}

		if (start >= body.length || start > end) {
			res.writeHead(416, { 'content-range': `bytes */${body.length}` });
			res.end();
			return;
		}

		const slice = body.subarray(start, end + 1);
		res.writeHead(206, {
			...base,
			'content-length': String(slice.length),
			'content-range': `bytes ${start}-${end}/${body.length}`
		});
		res.end(slice);
	};
}

/**
 * Sends headers and the first chunk, then waits on `release()` before sending the
 * rest. Lets a test observe the proxy mid-body: the first chunk can only reach the
 * client if the proxy streams instead of buffering.
 */
export function dripBytes(body: Uint8Array, firstChunkSize: number) {
	let release: () => void = () => {};
	const released = new Promise<void>((resolve) => {
		release = resolve;
	});

	const handler: UpstreamHandler = async (_req, res) => {
		res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': String(body.length) });
		res.write(body.subarray(0, firstChunkSize));
		await released;
		if (!res.destroyed) res.end(body.subarray(firstChunkSize));
	};

	return { handler, release };
}

/** Responds only after `release()`, to hold the proxy in the wait-for-headers phase. */
export function holdHeaders(respond: UpstreamHandler) {
	let release: () => void = () => {};
	const released = new Promise<void>((resolve) => {
		release = resolve;
	});

	const handler: UpstreamHandler = async (req, res) => {
		await released;
		if (!res.destroyed) await respond(req, res);
	};

	return { handler, release };
}

export interface ProxyFixture {
	description: string;
	/** True until replaced by a recording from scripts/record-proxy-fixture.mjs. */
	synthetic: boolean;
	recordedAt: string | null;
	request: {
		/** Upstream path, e.g. /videoplayback */
		path: string;
		/** Upstream query without host and range, exactly as googlevideo received it. */
		query: string;
		/** Range param value without the bytes= prefix, or null for an un-ranged request. */
		range: string | null;
	};
	upstream: {
		status: number;
		headers: Record<string, string>;
		bodyBase64: string;
	};
}

/** Replays a recorded googlevideo exchange regardless of what was asked for. */
export function replay(fixture: ProxyFixture): UpstreamHandler {
	const body = Buffer.from(fixture.upstream.bodyBase64, 'base64');
	return (_req, res) => {
		res.writeHead(fixture.upstream.status, fixture.upstream.headers);
		res.end(body);
	};
}
