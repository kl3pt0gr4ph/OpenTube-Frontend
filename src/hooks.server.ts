import type { Handle } from '@sveltejs/kit/hooks';
import { withSecurityHeaders } from '#lib/server/securityHeaders.js';

/** Headers on fetched responses that universal loads may read after hydration. */
const SERIALIZED_RESPONSE_HEADERS: ReadonlySet<string> = new Set(['content-type', 'x-stream-type']);

export const handle: Handle = async ({ event, resolve }): Promise<Response> => {
	const response: Response = await resolve(event, {
		filterSerializedResponseHeaders: (name: string): boolean =>
			SERIALIZED_RESPONSE_HEADERS.has(name)
	});
	return withSecurityHeaders(response);
};
