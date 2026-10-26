/**
 * Test Suite: /health
 *
 * The container HEALTHCHECK hits this every 30 seconds, so it must answer from
 * the frontend alone: no backend call, no page render.
 */

import { describe, it, expect, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { GET } from './+server';

describe('GET /health', () => {
	it('returns 200 healthy as uncached plain text', async () => {
		const res = await GET({} as RequestEvent);

		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
		expect(res.headers.get('cache-control')).toBe('no-store');
		expect(await res.text()).toBe('healthy\n');
	});

	it('makes no network call', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');

		await GET({} as RequestEvent);

		expect(fetchSpy).not.toHaveBeenCalled();
	});
});
