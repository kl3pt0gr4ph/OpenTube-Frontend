import { describe, it, expect, vi } from 'vitest';
import { load } from './+page';
import kioskResponseFixture from '../tests/fixtures/api/kioskVideosApiResponse.json';
import kioskVideosFixture from '../tests/fixtures/adapters/kioskVideosAdaptedResponse.json';

import type { KioskVideoConfig } from '#lib/adapters/kiosk.js';

interface LoadResponse {
	sections: { id: string; title: string; videos: KioskVideoConfig[] }[];
}

const okResponse = (body: unknown = kioskResponseFixture) => ({
	ok: true,
	status: 200,
	statusText: 'OK',
	json: async () => body
});

const failedResponse = (status = 503, statusText = 'Service Unavailable') => ({
	ok: false,
	status,
	statusText,
	json: async () => ({})
});

/** Responds with the fixture for every kiosk, except those named in `overrides`. */
const kioskFetch = (overrides: Record<string, unknown> = {}) =>
	vi.fn().mockImplementation(async (url: string) => {
		const kioskId = decodeURIComponent(String(url).split('/kiosks/')[1] ?? '');
		return kioskId in overrides ? overrides[kioskId] : okResponse();
	});

const runLoad = (fetch: ReturnType<typeof vi.fn>) =>
	load({
		url: new URL('https://opentube.com/'),
		fetch,
		params: {},
		route: { id: '/' }
	} as never) as Promise<LoadResponse>;

describe('landing page load function integration', () => {
	it('loads every kiosk through the complete pipeline', async () => {
		const fetch = kioskFetch();

		const { sections } = await runLoad(fetch);

		expect(fetch).toHaveBeenCalledTimes(4);
		[
			'trending_gaming',
			'trending_movies_and_shows',
			'trending_podcasts_episodes',
			'trending_music'
		].forEach((id) => expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`/kiosks/${id}`)));

		expect(sections.map((s) => s.title)).toEqual(['Gaming', 'Movies & Shows', 'Podcasts', 'Music']);

		// fixture: 10 items, 1 with no name (filtered by the adapter) → 9 videos
		expect(sections[0].videos).toHaveLength(9);
		expect(sections[0].videos[0]).toEqual(kioskVideosFixture[0]);
	});

	it('omits a kiosk that fails and keeps the rest', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const fetch = kioskFetch({ trending_music: failedResponse(404, 'Not Found') });

		const { sections } = await runLoad(fetch);

		expect(sections.map((s) => s.id)).toEqual([
			'trending_gaming',
			'trending_movies_and_shows',
			'trending_podcasts_episodes'
		]);
		expect(sections[0].videos).toHaveLength(9);
	});

	it('returns no sections when every kiosk is unavailable', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const fetch = vi.fn().mockResolvedValue(failedResponse());

		const { sections } = await runLoad(fetch);

		expect(sections).toEqual([]);
	});

	it('survives a network-level rejection', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

		const { sections } = await runLoad(fetch);

		expect(sections).toEqual([]);
	});

	it('omits a kiosk whose items all fail adaptation', async () => {
		const fetch = kioskFetch({
			trending_gaming: okResponse({ ...kioskResponseFixture, items: [] })
		});

		const { sections } = await runLoad(fetch);

		expect(sections.map((s) => s.id)).not.toContain('trending_gaming');
		expect(sections).toHaveLength(3);
	});
});
