import type { RequestHandler } from '@sveltejs/kit';
import { proxyStream } from '#lib/server/proxy/stream.js';

/**
 * Media proxy for googlevideo.com. Contract: docs/proxy-contract.md.
 *
 * `request.signal` is what carries client disconnects to the upstream fetch: in
 * adapter-node it aborts when the browser goes away, before or during the body.
 */
export const GET: RequestHandler = ({ request }): Promise<Response> => proxyStream(request);

/**
 * Without this, SvelteKit answers HEAD by running GET, which would start a full
 * upstream download that nobody reads.
 */
export const HEAD: RequestHandler = (): Response =>
	new Response(null, { status: 405, headers: { allow: 'GET' } });
