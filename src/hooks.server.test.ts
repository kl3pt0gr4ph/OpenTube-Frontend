/**
 * Test Suite: hooks.server.ts and securityHeaders.ts
 *
 * The handle hook takes over nginx's `add_header ... always` lines, so every
 * response that SvelteKit produces (pages, errors, /api, /proxy, /health) must
 * carry the security headers, and X-XSS-Protection must be gone.
 */

import { describe, it, expect } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import type { ResolveOptions } from '@sveltejs/kit/hooks';
import { handle } from './hooks.server';
import { SECURITY_HEADERS, withSecurityHeaders } from '#lib/server/securityHeaders.js';

function runHandle(response: Response) {
	let options: ResolveOptions | undefined;
	const resolve = async (_event: RequestEvent, opts?: ResolveOptions): Promise<Response> => {
		options = opts;
		return response;
	};
	const event = { url: new URL('http://opentube.local/') } as RequestEvent;
	const result: Promise<Response> = Promise.resolve(handle({ event, resolve }));
	return { result, options: () => options };
}

describe('handle', () => {
	it.each([
		['a page', 200, 'text/html'],
		['a 404 page', 404, 'text/html'],
		['an /api response', 200, 'application/json'],
		['a /proxy partial response', 206, 'video/mp4'],
		['a 502 from the forwarder', 502, 'text/plain; charset=utf-8']
	])('adds the security headers to %s', async (_label: string, status: number, type: string) => {
		const { result } = runHandle(
			new Response('body', { status, headers: { 'content-type': type } })
		);

		const res = await result;

		expect(res.status).toBe(status);
		expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
		expect(res.headers.get('x-content-type-options')).toBe('nosniff');
		expect(res.headers.get('content-type')).toBe(type);
	});

	it('no longer sends X-XSS-Protection', async () => {
		const { result } = runHandle(new Response('body'));

		expect((await result).headers.get('x-xss-protection')).toBeNull();
	});

	it.each([
		['content-type', true],
		['x-stream-type', true],
		['set-cookie', false],
		['server-timing', false],
		['x-upstream-status', false]
	])(
		'serializes the fetched-response header %s for hydration: %s',
		async (name: string, serialized: boolean) => {
			const { result, options } = runHandle(new Response('body'));
			await result;

			expect(options()?.filterSerializedResponseHeaders?.(name, '')).toBe(serialized);
		}
	);
});

describe('withSecurityHeaders', () => {
	it('sets the headers in place on an ordinary response', () => {
		const original = new Response('body', { headers: { etag: '"v1"' } });

		const res = withSecurityHeaders(original);

		expect(res).toBe(original);
		for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
			expect(res.headers.get(name)).toBe(value);
		}
		expect(res.headers.get('etag')).toBe('"v1"');
	});

	it('overrides a weaker value set by a route', () => {
		const res = withSecurityHeaders(
			new Response('body', { headers: { 'x-frame-options': 'ALLOW-FROM https://example.com' } })
		);

		expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
	});

	it('copies a response with immutable headers, keeping status, headers and body', async () => {
		const immutable = Response.redirect('http://opentube.local/elsewhere', 302);
		expect(() => immutable.headers.set('x-test', '1')).toThrow();

		const res = withSecurityHeaders(immutable);

		expect(res).not.toBe(immutable);
		expect(res.status).toBe(302);
		expect(res.headers.get('location')).toBe('http://opentube.local/elsewhere');
		expect(res.headers.get('x-content-type-options')).toBe('nosniff');
	});
});
