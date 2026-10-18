import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DOMParser as XMLDomParser } from '@xmldom/xmldom';
import { load, type VideoPageData } from './+page';
import detailsResponseFixture from '../../../tests/fixtures/api/detailsResponseFixture.json';
import thumbnailsResponseFixture from '../../../tests/fixtures/api/thumbnailsResponseFixture.json';
import manifestXmlFixture from '../../../tests/fixtures/api/manifestXmlFixture.xml?raw';
import relatedVideosFixture from '../../../tests/fixtures/api/relatedVideosResponse.json';
import playlistResponseFixture from '../../../tests/fixtures/api/playlistResponse.json';
import commentsResponseFixture from '../../../tests/fixtures/api/commentsResponse.json';
import type { RelatedVideoConfig } from '#lib/adapters/related.js';

const createMockManifestXml = (duration: string = 'PT2M56S'): string =>
	manifestXmlFixture
		.replace('STANDARD_DURATION', `duration="${duration}"`)
		.replace('MEDIA_PRESENTATION_DURATION', `mediaPresentationDuration="${duration}"`);

// getManifest reads res.headers.get('X-Stream-Type') for the muxed-progressive
// fallback, so every mocked manifest response must include a headers object
const createManifestResponse = (
	xml: string,
	headers: Record<string, string> = {}
): { ok: boolean; headers: Headers; text: () => Promise<string> } => ({
	ok: true,
	headers: new Headers(headers),
	text: async () => xml
});

const failedResponse = { ok: false, status: 500, statusText: 'Internal Server Error' };

// URL-routed fetch: robust to the loader's call order (Promise.all), and
// per-test overrides replace exactly one endpoint's behaviour.
type RouteOverrides = Partial<
	Record<
		'thumbnails' | 'details' | 'dash' | 'related' | 'comments' | 'playlists',
		unknown | (() => unknown)
	>
>;

const createRouteFetch = (overrides: RouteOverrides = {}) => {
	const routes: Record<string, () => unknown> = {
		'/streams/thumbnails': () => ({ ok: true, json: async () => thumbnailsResponseFixture }),
		'/streams/details': () => ({ ok: true, json: async () => detailsResponseFixture[0] }),
		'/streams/dash': () => createManifestResponse(createMockManifestXml('PT1H2M3S')),
		'/streams/related': () => ({ ok: true, json: async () => relatedVideosFixture }),
		'/comments': () => ({ ok: true, json: async () => commentsResponseFixture[0] }),
		'/playlists': () => ({ ok: true, json: async () => playlistResponseFixture })
	};
	for (const [key, value] of Object.entries(overrides)) {
		routes[
			`/${key === 'dash' ? 'streams/dash' : key === 'playlists' ? 'playlists' : `streams/${key}`}`.replace(
				'streams/comments',
				'comments'
			)
		] = typeof value === 'function' ? (value as () => unknown) : () => value;
	}
	return vi.fn(async (url: string) => {
		const route = Object.keys(routes).find((path) => url.includes(path));
		if (route) return routes[route]();
		throw new Error(`Unrouted fetch in test: ${url}`);
	});
};

const runLoad = (fetch: ReturnType<typeof createRouteFetch>, search = '', id = 'test-video-id') =>
	load({
		params: { id },
		fetch,
		url: new URL(`https://opentube.com/video/${id}${search}`),
		route: { id: '/video/[id]' },
		data: {}
	} as never) as Promise<VideoPageData>;

describe('video/[id] load function integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		global.DOMParser = class DOMParser {
			parseFromString(str: string, type: string) {
				return new XMLDomParser().parseFromString(str, type);
			}
		} as never;
		global.URL.createObjectURL = vi.fn(() => 'blob:mock-manifest-url');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('loads complete page data through the full pipeline', async () => {
		const fetch = createRouteFetch();

		const result = await runLoad(fetch);

		// one call per endpoint, each with the video id
		expect(fetch).toHaveBeenCalledTimes(5);
		for (const endpoint of [
			'/streams/thumbnails',
			'/streams/details',
			'/streams/dash',
			'/streams/related',
			'/comments'
		]) {
			expect(
				fetch.mock.calls.some(([url]) => (url as string).includes(`${endpoint}?id=test-video-id`))
			).toBe(true);
		}

		expect(result.playerConfig).toEqual({
			manifestUrl: 'blob:mock-manifest-url',
			duration: 3723, // PT1H2M3S
			poster: 'https://i.ytimg.com/vi/pilot-id/xl.jpg',
			isMuxed: false
		});
		expect(result.metadata.title).toBe('MURDER DRONES - Pilot');
		expect(result.metadata.channelName).toBe('GLITCH');
		expect(result.relatedItems).toHaveLength(4);
		expect((result.relatedItems[0] as RelatedVideoConfig).title).toBe('MURDER DRONES - Heartbeat');

		expect(result.comments).toBeDefined();
		expect(result.comments!.length).toBeGreaterThan(0);
		expect(result.comments![0].author).toBeTruthy();

		// no playlist context without a ?playlist param
		expect(result.playlistId).toBeNull();
		expect(result.playlistIndex).toBeNull();
		expect(result.playlistVideos).toBeNull();
		expect(result.playlistInfo).toBeNull();
		expect(result.error).toBeUndefined();
	});

	it('propagates the muxed flag and direct URL for muxed-progressive streams', async () => {
		const fetch = createRouteFetch({
			dash: () => ({
				ok: true,
				headers: new Headers({ 'X-Stream-Type': 'muxed-progressive' }),
				text: async () => 'https://rr3---sn-test.googlevideo.com/videoplayback?id=123'
			})
		});
		vi.spyOn(console, 'log').mockImplementation(() => {});

		const result = await runLoad(fetch);

		expect(result.playerConfig.isMuxed).toBe(true);
		expect(result.playerConfig.manifestUrl).toBe(
			'https://rr3---sn-test.googlevideo.com/videoplayback?id=123'
		);
		expect(result.playerConfig.duration).toBe(0);
		expect(result.error).toBeUndefined();
	});

	describe('playlist context', () => {
		it('fetches and adapts the playlist when ?playlist is present', async () => {
			const fetch = createRouteFetch();

			const result = await runLoad(fetch, '?playlist=glitch-playlist-id&index=2');

			expect(
				fetch.mock.calls.some(([url]) =>
					(url as string).includes('/playlists?id=glitch-playlist-id')
				)
			).toBe(true);
			expect(result.playlistId).toBe('glitch-playlist-id');
			expect(result.playlistIndex).toBe(2);
			// real adapters over the real fixture
			expect(result.playlistInfo?.name).toBe('Murder Drones');
			expect(result.playlistInfo?.uploaderName).toBe('GLITCH');
			expect(result.playlistVideos?.[0].id).toBe('glitch-video-1');
			expect(result.playlistVideos?.[0].title).toBe('MURDER DRONES - Episode 1: PILOT');
		});

		it('defaults the playlist index to 0 when ?index is missing', async () => {
			const result = await runLoad(createRouteFetch(), '?playlist=glitch-playlist-id');
			expect(result.playlistIndex).toBe(0);
		});

		it('does not fetch the playlist when the param is absent', async () => {
			const fetch = createRouteFetch();

			const result = await runLoad(fetch);

			expect(fetch.mock.calls.every(([url]) => !(url as string).includes('/playlists'))).toBe(true);
			expect(result.playlistId).toBeNull();
			expect(result.playlistVideos).toBeNull();
			expect(result.playlistInfo).toBeNull();
		});

		it('degrades gracefully when the playlist fetch fails', async () => {
			const fetch = createRouteFetch({ playlists: failedResponse });
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = await runLoad(fetch, '?playlist=glitch-playlist-id&index=1');

			expect(result.error).toBeUndefined();
			expect(result.playlistId).toBe('glitch-playlist-id');
			expect(result.playlistVideos).toBeNull();
			expect(result.playlistInfo).toBeNull();
			expect(warnSpy).toHaveBeenCalledWith('Failed to fetch playlist:', expect.any(Error));
		});
	});

	describe('partial failure degradation', () => {
		it('continues loading when related videos fail', async () => {
			const fetch = createRouteFetch({ related: failedResponse });
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = await runLoad(fetch);

			expect(result.metadata.title).toBe('MURDER DRONES - Pilot');
			expect(result.playerConfig.manifestUrl).toBe('blob:mock-manifest-url');
			expect(result.relatedItems).toEqual([]);
			expect(result.error).toBeUndefined();
			expect(warnSpy).toHaveBeenCalledWith('Failed to fetch related items:', expect.any(Error));
		});

		it('continues loading when comments fail', async () => {
			const fetch = createRouteFetch({ comments: failedResponse });
			vi.spyOn(console, 'warn').mockImplementation(() => {});
			vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = await runLoad(fetch);

			expect(result.metadata.title).toBe('MURDER DRONES - Pilot');
			expect(result.error).toBeUndefined();
			// NOTE: adjust if the loader's comments .catch yields null instead of []
			expect(result.comments).toEqual([]);
		});
	});

	describe('error handling', () => {
		it('returns error page data on 404', async () => {
			const fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });
			vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = await runLoad(fetch as never, '', 'nonexistent-video');

			expect(result.metadata.title).toBe('Error Loading Video');
			expect(result.error).toContain('Failed to fetch');
			expect(result.playerConfig.manifestUrl).toBe('');
			expect(result.relatedItems).toEqual([]);
		});

		it('surfaces network error messages', async () => {
			const fetch = vi.fn().mockRejectedValue(new Error('Network connection failed'));
			vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = await runLoad(fetch as never);

			expect(result.metadata.title).toBe('Error Loading Video');
			expect(result.error).toBe('Network connection failed');
		});

		it.each([
			['a non-Error value', 'String error'],
			['undefined', undefined]
		])('falls back to the default message when rejected with %s', async (_label, rejection) => {
			const fetch = vi.fn().mockRejectedValue(rejection);
			vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = await runLoad(fetch as never);

			expect(result.error).toBe('Unknown error loading video');
		});
	});
});
