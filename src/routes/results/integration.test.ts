import { describe, it, expect, vi } from 'vitest';
import { load } from './+page';
import searchResponseFixture from '../../tests/fixtures/api/searchApiResponse.json';
import type { NextPage } from '#lib/api/types.js';
import type { SearchResultConfig, VideoSearchResultConfig } from '#lib/adapters/search.js';

interface LoadResponse {
	results: {
		items: SearchResultConfig[];
		nextPage: NextPage | null;
		hasNextPage: boolean | undefined;
	};
	query: string;
	sortFilter: string;
	error: string | null;
}

const okFetch = () =>
	vi.fn().mockResolvedValue({ ok: true, json: async () => searchResponseFixture });

const runLoad = (fetch: ReturnType<typeof vi.fn>, search: string) =>
	load({
		url: new URL(`https://opentube.com/results${search}`),
		fetch,
		params: {},
		route: { id: '/results' },
		data: {}
	} as never) as Promise<LoadResponse>;

describe('results load function integration', () => {
	it('loads search results through the complete pipeline', async () => {
		const fetch = okFetch();

		const search = await runLoad(fetch, '?query=murder%20drones&sort=desc');

		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining('/search?searchString=murder%20drones&sortFilter=desc')
		);

		// fixture: 5 items, 1 invalid (filtered) → 2 streams + 1 channel + 1 playlist
		expect(search.results.items).toHaveLength(4);
		expect(search.results.items.filter((r) => r.type === 'stream')).toHaveLength(2);
		expect(search.results.items.filter((r) => r.type === 'channel')).toHaveLength(1);
		expect(search.results.items.filter((r) => r.type === 'playlist')).toHaveLength(1);

		const pilot = search.results.items.find(
			(r): r is VideoSearchResultConfig =>
				r.type === 'stream' && (r as VideoSearchResultConfig).title === 'MURDER DRONES - Pilot'
		);
		expect(pilot).toBeDefined();

		expect(search.query).toBe('murder drones');
		expect(search.sortFilter).toBe('desc');
		expect(search.error).toBeNull();
	});

	it.each([
		['defaults to asc when ?sort is absent', '?query=test', 'asc'],
		['passes a custom ?sort through', '?query=test&sort=date', 'date']
	])('%s', async (_label, params, expected) => {
		const fetch = okFetch();

		const search = await runLoad(fetch, params);

		expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`sortFilter=${expected}`));
		expect(search.sortFilter).toBe(expected);
	});

	describe('empty query handling', () => {
		it.each([
			['missing query param', ''],
			['empty query', '?query='],
			['whitespace-only query', '?query=%20%20%20']
		])('returns empty results without fetching for %s', async (_label, params) => {
			const fetch = vi.fn();

			const search = await runLoad(fetch, params);

			expect(fetch).not.toHaveBeenCalled();
			expect(search).toEqual({
				results: { items: [], nextPage: null, hasNextPage: false },
				query: '',
				error: null
			});
		});
	});

	describe('error handling', () => {
		it('maps API errors to the search error message', async () => {
			const fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });
			vi.spyOn(console, 'error').mockImplementation(() => {});

			const search = await runLoad(fetch, '?query=error%20test&sort=asc');

			expect(search.results).toEqual({ items: [], nextPage: null, hasNextPage: false });
			expect(search.query).toBe('error test');
			expect(search.sortFilter).toBe('asc');
			expect(search.error).toContain('Could not load search results');
		});

		it('passes network error messages through', async () => {
			const fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
			vi.spyOn(console, 'error').mockImplementation(() => {});

			const search = await runLoad(fetch, '?query=network%20error');

			expect(search.results).toEqual({ items: [], nextPage: null, hasNextPage: false });
			expect(search.query).toBe('network error');
			expect(search.error).toBe('Failed to fetch');
		});

		it('falls back to the default message for non-Error rejections', async () => {
			const fetch = vi.fn().mockRejectedValue('Something went wrong');
			vi.spyOn(console, 'error').mockImplementation(() => {});

			const search = await runLoad(fetch, '?query=test');

			expect(search.results).toEqual({ items: [], nextPage: null, hasNextPage: false });
			expect(search.error).toBe('Failed to load search results');
		});
	});
});
