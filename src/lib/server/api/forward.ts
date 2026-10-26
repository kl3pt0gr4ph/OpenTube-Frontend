/**
 * Same-origin forwarder for the NewPipeExtractorAPI backend, served at /api.
 *
 * Four rules this file must not break:
 *  1. Never buffer. The backend body is handed straight to the Response. No
 *     arrayBuffer(), text() or json() on any path.
 *  2. Abort propagation. The client's request signal goes into the backend fetch,
 *     so a navigation away closes the backend connection too.
 *  3. Response headers are an allowlist. undici decodes compressed bodies, so a
 *     forwarded Content-Encoding (or its encoded Content-Length) would corrupt them.
 *  4. Backend status passes through unchanged, and so does its body, error
 *     responses included: the API functions report the status they see.
 */

export type BackendFetch = (url: URL, init: RequestInit) => Promise<Response>;

export interface ApiForwardOptions {
	backendUrl: string | undefined;
	mountPath?: string;
	clientAddress?: string;
	fetch?: BackendFetch;
	headersTimeoutMs?: number;
}

/** The only client request headers sent to the backend. No cookies, no auth. */
export const FORWARDED_REQUEST_HEADERS: readonly string[] = Object.freeze([
	'accept',
	'accept-language',
	'if-none-match',
	'if-modified-since'
]);

/**
 * The only backend response headers that reach the client. `content-type` and
 * `x-stream-type` carry the muxed-progressive fallback signal for /streams/dash.
 */
export const FORWARDED_RESPONSE_HEADERS: readonly string[] = Object.freeze([
	'content-type',
	'content-length',
	'content-language',
	'cache-control',
	'etag',
	'last-modified',
	'expires',
	'retry-after',
	'x-stream-type'
]);

const DEFAULT_HEADERS_TIMEOUT_MS = 60_000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

function forwardError(status: number, code: string, message: string): Response {
	return new Response(message, {
		status,
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'no-store',
			'x-api-error': code
		}
	});
}

async function discard(response: Response): Promise<void> {
	await response.body?.cancel().catch(() => undefined);
}

/**
 * Parses the configured backend address. Only plain http(s) origins with an
 * optional path prefix are accepted; anything else is a deployment mistake.
 */
export function parseBackendUrl(raw: string | undefined): URL | null {
	if (!raw?.trim()) return null;
	let url: URL;
	try {
		url = new URL(raw.trim());
	} catch {
		return null;
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
	if (url.username || url.password || url.search || url.hash) return null;
	return url;
}

function isUnderMount(pathname: string, mountPath: string): boolean {
	return pathname === mountPath || pathname.startsWith(`${mountPath}/`);
}

function backendTarget(base: URL, incoming: URL): URL {
	const target = new URL(base.origin);
	target.pathname = base.pathname.replace(/\/+$/, '') + incoming.pathname;
	target.search = incoming.search;
	return target;
}

/**
 * X-Forwarded-For is extended, so the backend's logs can still see who asked. Proto and Host
 * are not sent: adapter-node reports https for every request unless PROTOCOL_HEADER
 * is set, so they'd be guesses.
 */
function backendRequestHeaders(request: Request, clientAddress?: string): Headers {
	const headers = new Headers({ 'accept-encoding': 'identity' });
	for (const name of FORWARDED_REQUEST_HEADERS) {
		const value: string | null = request.headers.get(name);
		if (value !== null) headers.set(name, value);
	}

	const forwardedFor: string = [request.headers.get('x-forwarded-for'), clientAddress]
		.filter((value: string | null | undefined): value is string => Boolean(value))
		.join(', ');
	if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);
	return headers;
}

export async function forwardToBackend(
	request: Request,
	options: ApiForwardOptions
): Promise<Response> {
	const mountPath: string = options.mountPath ?? '/api';
	const fetchBackend: BackendFetch =
		options.fetch ??
		((url: URL, init: RequestInit): Promise<Response> => globalThis.fetch(url, init));
	const headersTimeoutMs: number = options.headersTimeoutMs ?? DEFAULT_HEADERS_TIMEOUT_MS;

	if (request.method !== 'GET') {
		return new Response(null, { status: 405, headers: { allow: 'GET' } });
	}

	const base: URL | null = parseBackendUrl(options.backendUrl);
	if (!base) {
		console.error('[api] API_URL is not set to an http(s) URL; cannot reach the backend');
		return forwardError(500, 'not-configured', 'Backend address is not configured');
	}

	const incoming = new URL(request.url);
	if (!isUnderMount(incoming.pathname, mountPath)) {
		return forwardError(404, 'not-found', 'Not found');
	}

	const target: URL = backendTarget(base, incoming);
	const headers: Headers = backendRequestHeaders(request, options.clientAddress);

	const timeout = new AbortController();
	const timer: ReturnType<typeof setTimeout> = setTimeout(
		(): void => timeout.abort(),
		headersTimeoutMs
	);
	const signal: AbortSignal = AbortSignal.any([request.signal, timeout.signal]);
	const startedAt: number = performance.now();

	let backend: Response;
	try {
		backend = await fetchBackend(target, { headers, signal, redirect: 'manual' });
	} catch (error: unknown) {
		if (request.signal.aborted) return new Response(null, { status: 499 });
		if (timeout.signal.aborted) return forwardError(504, 'timeout', 'Backend timed out');

		// The path only: queries carry search terms and page tokens
		const cause = (error as { cause?: { code?: string; message?: string } })?.cause;
		console.warn(
			`[api] backend unreachable: ${target.origin}${target.pathname}`,
			cause?.code ?? cause?.message ?? String(error)
		);
		return forwardError(502, 'unreachable', 'Backend unreachable');
	} finally {
		clearTimeout(timer);
	}

	// The backend has no reason to redirect, and following one would let it point
	// this server anywhere. Its Location would also leak the internal hostname.
	if (REDIRECT_STATUSES.has(backend.status)) {
		await discard(backend);
		return forwardError(502, 'redirect', 'Backend redirect refused');
	}

	const responseHeaders = new Headers({
		'server-timing': `backend;dur=${Math.round(performance.now() - startedAt)}`
	});
	for (const name of FORWARDED_RESPONSE_HEADERS) {
		const value: string | null = backend.headers.get(name);
		if (value !== null) responseHeaders.set(name, value);
	}
	const encoding: string | null = backend.headers.get('content-encoding');
	if (encoding && encoding.toLowerCase() !== 'identity') responseHeaders.delete('content-length');

	if (NULL_BODY_STATUSES.has(backend.status)) {
		await discard(backend);
		return new Response(null, { status: backend.status, headers: responseHeaders });
	}

	const body: ReadableStream<Uint8Array> | null =
		backend.body?.pipeThrough(new TransformStream<Uint8Array, Uint8Array>()) ?? null;
	return new Response(body, {
		status: backend.status,
		statusText: backend.statusText,
		headers: responseHeaders
	});
}
