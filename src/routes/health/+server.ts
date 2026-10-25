import type { RequestHandler } from '@sveltejs/kit';

/**
 * Liveness check for the container HEALTHCHECK and reverse proxies.
 *
 * It answers from this process alone: no backend call and no page render, so a
 * slow or restarting backend doesn't get the frontend container marked unhealthy.
 */
export const GET: RequestHandler = (): Response =>
	new Response('healthy\n', {
		status: 200,
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'no-store'
		}
	});
