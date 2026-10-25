export const SECURITY_HEADERS: Readonly<Record<string, string>> = Object.freeze({
	'x-frame-options': 'SAMEORIGIN',
	'x-content-type-options': 'nosniff'
});

/**
 * Sets the security headers on `response`. A Response whose headers are
 * immutable is copied first, keeping its body as a stream.
 */
export function withSecurityHeaders(response: Response): Response {
	try {
		for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
			response.headers.set(name, value);
		}
		return response;
	} catch {
		const copy = new Response(response.body, response);
		for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
			copy.headers.set(name, value);
		}
		return copy;
	}
}
