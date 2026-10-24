/**
 * Same-origin stream proxy for googlevideo.com, served at /proxy.
 *
 * googlevideo URLs are bound to the IP that extracted them, so the browser can't
 * fetch them: every media byte goes through here.
 *
 * Four rules this file must not break:
 *  1. Never buffer. The upstream body is handed straight to the Response. No
 *     arrayBuffer(), text() or blob() on a success path.
 *  2. Abort propagation. The client's request signal goes into the upstream fetch,
 *     so a seek or navigation closes the googlevideo connection too.
 *  3. Response headers are an allowlist. undici decodes compressed bodies, so a
 *     forwarded Content-Encoding (or its encoded Content-Length) breaks playback.
 *  4. Upstream status passes through. 206 stays 206.
 */

export type UpstreamFetch = (url: URL, init: RequestInit) => Promise<Response>;

export interface StreamProxyOptions {
	mountPath?: string;
	upstreamOrigin?: (host: string) => string;
	fetch?: UpstreamFetch;
	headersTimeoutMs?: number;
	maxRedirects?: number;
}

/** Sent upstream on every request. Nothing from the client is forwarded except the range. */
export const UPSTREAM_REQUEST_HEADERS: Readonly<Record<string, string>> = Object.freeze({
	'user-agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
	accept: '*/*',
	'accept-language': 'en-US,en;q=0.9',
	referer: 'https://www.youtube.com/',
	origin: 'https://www.youtube.com',
	'accept-encoding': 'identity'
});

/** The only upstream response headers that reach the client. */
export const FORWARDED_RESPONSE_HEADERS: readonly string[] = Object.freeze([
	'content-type',
	'content-length',
	'content-range',
	'accept-ranges',
	'last-modified',
	'etag',
	'cache-control',
	'expires'
]);

const DEFAULT_HEADERS_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_REDIRECTS = 3;

const ALLOWED_HOST = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+googlevideo\.com$/;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

const RANGE_SPEC = /^(?:(\d+)-(\d*)|-(\d+))$/;

type RangeResult =
	{ kind: 'none' } | { kind: 'ok'; spec: string } | { kind: 'invalid'; status: 400 | 416 };

export function isAllowedUpstreamHost(host: string): boolean {
	return host.length <= 253 && ALLOWED_HOST.test(host);
}

export function parseRangeSpec(spec: string): RangeResult {
	const match = RANGE_SPEC.exec(spec);
	if (!match) return { kind: 'invalid', status: 400 };

	const [, start, end, suffix] = match;
	const numbers: number[] = [start, end, suffix]
		.filter((value: string | undefined): value is string => value !== undefined && value !== '')
		.map(Number);
	if (!numbers.every(Number.isSafeInteger)) return { kind: 'invalid', status: 400 };

	if (suffix !== undefined) {
		return Number(suffix) > 0 ? { kind: 'ok', spec } : { kind: 'invalid', status: 416 };
	}
	if (end !== '' && Number(start) > Number(end)) return { kind: 'invalid', status: 416 };
	return { kind: 'ok', spec };
}

/**
 * The player's request filter sends the range as a query param, because it strips
 * request headers. A native <video> element sends a Range header instead, which is
 * honoured only when there's no param. A malformed header is ignored, as RFC 9110
 * allows; a malformed param is our own contract being broken, so it's an error.
 */
function resolveRange(param: string | null, header: string | null): RangeResult {
	if (param) return parseRangeSpec(param);

	const match = /^bytes=(.+)$/.exec(header ?? '');
	if (!match) return { kind: 'none' };
	const parsed: RangeResult = parseRangeSpec(match[1]);
	return parsed.kind === 'ok' ? parsed : { kind: 'none' };
}

/**
 * Drops `host` and `range` from the query textually, so every other parameter
 * reaches googlevideo byte-identical and in its original order.
 */
function upstreamQuery(search: string): string {
	return search
		.replace(/^\?/, '')
		.split('&')
		.filter((pair: string) => {
			if (pair === '') return false;
			const rawKey: string = pair.split('=', 1)[0];
			let key: string = rawKey;
			try {
				key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
			} catch {
				// Undecodable key: keep the raw form, which can't equal host or range
			}
			return key !== 'host' && key !== 'range';
		})
		.join('&');
}

/**
 * A redirect is followed only to an https URL on an allowed googlevideo host.
 * Relative locations resolve against the googlevideo URL, not the test origin.
 */
function redirectTarget(location: string | null, current: URL): URL | null {
	if (!location) return null;
	let next: URL;
	try {
		next = new URL(location, current);
	} catch {
		return null;
	}
	const plainHttps: boolean =
		next.protocol === 'https:' && next.port === '' && !next.username && !next.password;
	return plainHttps && isAllowedUpstreamHost(next.hostname) ? next : null;
}

function proxyError(status: number, code: string, message: string): Response {
	return new Response(message, {
		status,
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'no-store',
			'x-proxy-error': code
		}
	});
}

async function discard(response: Response): Promise<void> {
	await response.body?.cancel().catch(() => undefined);
}

/**
 * Fetches `target`, following googlevideo redirects. Resolves null when a redirect
 * is refused (off-allowlist target, or too many hops).
 */
async function fetchFollowingRedirects(
	target: URL,
	init: RequestInit,
	upstreamOrigin: (host: string) => string,
	fetchUpstream: UpstreamFetch,
	maxRedirects: number
): Promise<Response | null> {
	let current: URL = target;
	for (let hop = 0; hop <= maxRedirects; hop++) {
		const physical = new URL(upstreamOrigin(current.hostname));
		physical.pathname = current.pathname;
		physical.search = current.search;

		const response: Response = await fetchUpstream(physical, { ...init, redirect: 'manual' });
		if (!REDIRECT_STATUSES.has(response.status)) return response;

		const next: URL | null =
			hop < maxRedirects ? redirectTarget(response.headers.get('location'), current) : null;
		await discard(response);
		if (!next) return null;
		current = next;
	}
	return null;
}

export async function proxyStream(
	request: Request,
	options: StreamProxyOptions = {}
): Promise<Response> {
	const mountPath: string = options.mountPath ?? '/proxy';
	const upstreamOrigin: (host: string) => string =
		options.upstreamOrigin ?? ((host: string): string => `https://${host}`);
	const fetchUpstream: UpstreamFetch =
		options.fetch ??
		((url: URL, init: RequestInit): Promise<Response> => globalThis.fetch(url, init));
	const headersTimeoutMs: number = options.headersTimeoutMs ?? DEFAULT_HEADERS_TIMEOUT_MS;
	const maxRedirects: number = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

	const incoming = new URL(request.url);

	const host: string = (incoming.searchParams.get('host') ?? '').toLowerCase();
	if (!host) return proxyError(400, 'missing-host', "Missing 'host' query parameter");
	if (!isAllowedUpstreamHost(host)) {
		return proxyError(400, 'invalid-host', 'Invalid host - must be a googlevideo.com host');
	}

	const range: RangeResult = resolveRange(
		incoming.searchParams.get('range'),
		request.headers.get('range')
	);
	if (range.kind === 'invalid') return proxyError(range.status, 'invalid-range', 'Invalid range');

	const path: string = incoming.pathname.startsWith(mountPath)
		? incoming.pathname.slice(mountPath.length)
		: incoming.pathname;

	const target = new URL(`https://${host}`);
	target.pathname = path || '/';
	target.search = upstreamQuery(incoming.search);

	const headers = new Headers(UPSTREAM_REQUEST_HEADERS);
	if (range.kind === 'ok') headers.set('range', `bytes=${range.spec}`);

	const timeout = new AbortController();
	const timer: ReturnType<typeof setTimeout> = setTimeout(() => timeout.abort(), headersTimeoutMs);
	const signal: AbortSignal = AbortSignal.any([request.signal, timeout.signal]);
	const startedAt: number = performance.now();

	let fetched: Response | null;
	try {
		fetched = await fetchFollowingRedirects(
			target,
			{ headers, signal },
			upstreamOrigin,
			fetchUpstream,
			maxRedirects
		);
	} catch (error: unknown) {
		if (request.signal.aborted) return new Response(null, { status: 499 });
		if (timeout.signal.aborted) return proxyError(504, 'timeout', 'Upstream timed out');

		const cause = (error as { cause?: { code?: string; message?: string } })?.cause;
		console.warn(
			`[proxy] upstream unreachable: ${target.hostname}${target.pathname}`,
			cause?.code ?? cause?.message ?? String(error)
		);
		return proxyError(502, 'unreachable', 'Upstream unreachable');
	} finally {
		clearTimeout(timer);
	}

	if (!fetched) return proxyError(502, 'redirect', 'Upstream redirect refused');
	const upstream: Response = fetched;

	const upstreamHeaders: Record<string, string> = {
		'x-upstream-status': String(upstream.status),
		'server-timing': `upstream;dur=${Math.round(performance.now() - startedAt)}`
	};

	if (!upstream.ok) {
		await discard(upstream);
		const body: string | null = NULL_BODY_STATUSES.has(upstream.status)
			? null
			: `Upstream responded ${upstream.status}`;
		return new Response(body, {
			status: upstream.status,
			headers: {
				'content-type': 'text/plain; charset=utf-8',
				'cache-control': 'no-store',
				...upstreamHeaders
			}
		});
	}

	const responseHeaders = new Headers(upstreamHeaders);
	for (const name of FORWARDED_RESPONSE_HEADERS) {
		const value: string | null = upstream.headers.get(name);
		if (value !== null) responseHeaders.set(name, value);
	}
	const encoding: string | null = upstream.headers.get('content-encoding');
	if (encoding && encoding.toLowerCase() !== 'identity') responseHeaders.delete('content-length');

	const body: ReadableStream<Uint8Array> | null =
		upstream.body?.pipeThrough(new TransformStream<Uint8Array, Uint8Array>()) ?? null;
	return new Response(body, { status: upstream.status, headers: responseHeaders });
}
