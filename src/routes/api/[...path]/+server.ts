import type { RequestEvent, RequestHandler } from '@sveltejs/kit';
import { API_URL } from '$app/env/private';
import { forwardToBackend } from '#lib/server/api/forward.js';

/**
 * Forwards /api/* to the backend at API_URL.
 *
 * Server-side loads that pass SvelteKit's `fetch` into the API functions land
 * here in-process, so SSR needs no network hop to reach this route.
 * `request.signal` carries client disconnects to the backend fetch.
 */
export const GET: RequestHandler = (event: RequestEvent): Promise<Response> =>
	forwardToBackend(event.request, {
		backendUrl: API_URL,
		clientAddress: clientAddress(event)
	});

const methodNotAllowed = (): Response =>
	new Response(null, { status: 405, headers: { allow: 'GET' } });

export const HEAD: RequestHandler = methodNotAllowed;
export const fallback: RequestHandler = methodNotAllowed;

function clientAddress(event: RequestEvent): string | undefined {
	try {
		return event.getClientAddress();
	} catch {
		return undefined;
	}
}
