import { describe, it, expect, vi, beforeEach } from 'vitest';
import channelDetailsResponseFixture from '../../../tests/fixtures/api/channelDetailsApiResponse.json';
import channelVideosResponseFixture from '../../../tests/fixtures/api/channelVideosApiResponse.json';
import channelDetailsFixture from '../../../tests/fixtures/adapters/channelDetailsAdaptedResponse.json';
import channelVideosFixture from '../../../tests/fixtures/adapters/channelVideosAdaptedResponse.json';
import thumbnailFallback from '#lib/assets/placeholders/thumbnailFallback.svg';

// Mock only the HTTP boundary — real adapters run so the full pipeline
// (API response → adapter → page data) is exercised end-to-end.
vi.mock('#lib/api/channel.js', () => ({
	getChannelInfo: vi.fn(),
	getChannelVideos: vi.fn()
}));

// Mock asset imports (no real files available in test environment)
vi.mock('#lib/assets/placeholder/thumbnailFallback.svg', () => ({
	default: '/thumbnailFallback.svg'
}));

vi.mock('#lib/assets/placeholder/logofallback.svg', () => ({
	default: '/logofallback.svg'
}));

// Mock extractIdFromUrl so URL parsing doesn't pull in unrelated deps
vi.mock('#lib/utils/streamSelection.js', () => ({
	extractIdFromUrl: vi.fn((url: string) => {
		const match = url.match(/[?&]v=([^&]+)/);
		return match ? match[1] : (url.split('/').at(-1) ?? '');
	})
}));

import {
	type ChannelInfoApiResponse,
	type ChannelVideosApiResponse,
	getChannelInfo,
	getChannelVideos
} from '#lib/api/channel.js';
import { loadChannelData } from '#lib/loaders/channel.js';
import type { ChannelConfig, ChannelVideoPage } from '#lib/adapters/channel.js';

const infoResponse = channelDetailsResponseFixture as unknown as ChannelInfoApiResponse;
const videosResponse = channelVideosResponseFixture as unknown as ChannelVideosApiResponse;
const expectedChannel = channelDetailsFixture as ChannelConfig;
const expectedVideos = channelVideosFixture as ChannelVideoPage;

const mockFetch = vi.fn() as unknown as typeof globalThis.fetch;

const loadChannel = (channelId = 'glitch-channel-id') => loadChannelData(channelId, mockFetch);

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(getChannelInfo).mockResolvedValue(infoResponse);
	vi.mocked(getChannelVideos).mockResolvedValue(videosResponse);
});

describe('Channel +page.ts — integration', () => {
	describe('Successful full pipeline', () => {
		it('should return adapted channel and videos matching the known-good fixtures', async () => {
			const result = await loadChannel();

			expect(result.channel).toEqual({
				...expectedChannel,
				videoCount: expectedVideos.items.length
			});
			expect(result.videos).toEqual(expectedVideos.items);
			expect(result.nextPage).toEqual(expectedVideos.nextPage);
			expect(result.error).toBeUndefined();
		});

		it('should pass the channelId from params to both API calls exactly once each', async () => {
			await loadChannel('some-other-channel');

			// Both calls fire concurrently via Promise.all
			expect(getChannelInfo).toHaveBeenCalledWith('some-other-channel', mockFetch);
			expect(getChannelVideos).toHaveBeenCalledWith('some-other-channel', mockFetch);
			expect(getChannelInfo).toHaveBeenCalledTimes(1);
			expect(getChannelVideos).toHaveBeenCalledTimes(1);
		});

		it('should pass the asset placeholder fallbacks through to the videos adapter', async () => {
			const responseWithNoThumbnails: ChannelVideosApiResponse = {
				...videosResponse,
				items: [{ ...videosResponse.items[0], thumbnails: [] }]
			};
			vi.mocked(getChannelVideos).mockResolvedValue(responseWithNoThumbnails);

			const result = await loadChannel();

			expect(result.videos[0].thumbnail).toBe(thumbnailFallback);
		});
	});

	describe('Partial degradation (videos fetch fails)', () => {
		it('should still return adapted channel data with empty videos and no error', async () => {
			vi.mocked(getChannelVideos).mockRejectedValue(new Error('Videos unavailable'));

			const result = await loadChannel();

			// The .catch(() => null) hands null to the videos adapter,
			// which returns []; the channel pipeline is unaffected
			expect(result.channel).toEqual(expectedChannel);
			expect(result.videos).toEqual([]);
			expect(result.error).toBeUndefined();
			expect(result.error).toBeUndefined();
		});
	});

	describe('Fatal error handling', () => {
		it('should return error page data with safe defaults when the channel fetch rejects', async () => {
			vi.mocked(getChannelInfo).mockRejectedValue(new Error('Channel not found'));

			const result = await loadChannel();

			expect(result.error).toBe('Channel not found');
			expect(result.channel).toEqual({
				id: '',
				name: 'Error Loading Channel',
				handle: '',
				avatarUrl: null,
				bannerUrl: null,
				description: null,
				subscriberCount: '0',
				videoCount: 0,
				verified: false
			});
			expect(result.videos).toEqual([]);
			expect(result.nextPage).toBeNull();
		});

		it('should use "Unknown error loading channel" for non-Error rejections', async () => {
			vi.mocked(getChannelInfo).mockRejectedValue('a plain string error');

			const result = await loadChannel();

			expect(result.error).toBe('Unknown error loading channel');
		});

		it('should return error page data instead of throwing when the adapter throws', async () => {
			vi.mocked(getChannelInfo).mockResolvedValue(null as unknown as ChannelInfoApiResponse);

			const result = await loadChannel();

			expect(result.channel.name).toBe('Error Loading Channel');
			expect(result.videos).toEqual([]);
			expect(result.nextPage).toBeNull();
		});
	});
});
