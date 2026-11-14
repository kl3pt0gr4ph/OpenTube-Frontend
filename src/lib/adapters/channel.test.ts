/**
 * Test Suite: channel.ts
 *
 * Tests for formatSubscriberCount, adaptChannelInfo, and adaptChannelVideos.
 */

import { describe, it, expect } from 'vitest';
import {
	formatSubscriberCount,
	adaptChannelInfo,
	adaptChannelVideos,
	adaptChannelTab,
	adaptChannelTabs,
	type ChannelVideoConfig,
	type ChannelVideoPage
} from './channel';
import {
	buildChannelDetailsResponse,
	buildChannelVideosResponse,
	buildChannelPlaylistItem,
	buildChannelTabResponse,
	buildRelatedItem
} from '../../tests/fixtures/builder';
import channelDetailsResponseFixture from '../../tests/fixtures/api/channelDetailsApiResponse.json';
import channelVideosResponseFixture from '../../tests/fixtures/api/channelVideosApiResponse.json';
import channelDetailsFixture from '../../tests/fixtures/adapters/channelDetailsAdaptedResponse.json';
import channelVideosFixture from '../../tests/fixtures/adapters/channelVideosAdaptedResponse.json';
import type { ChannelInfoApiResponse, ChannelVideosApiResponse } from '#lib/api/channel.js';

const thumbnailFallback = 'fallback-thumb.jpg';
const avatarFallback = 'fallback-avatar.jpg';

describe('formatSubscriberCount', () => {
	it.each([
		[-1, '0'],
		[-1_000_000, '0'],
		[0, '0'],
		[980, '980'],
		[999, '999'],
		[1_000, '1K'],
		[1_500, '1.5K'],
		[430_000, '430K'],
		[999_999, '1000K'],
		[1_000_000, '1M'],
		[1_050_000, '1.1M'],
		[20_600_000, '20.6M']
	])('%d → %s', (count, expected) => {
		expect(formatSubscriberCount(count)).toBe(expected);
	});
});

describe('adaptChannelInfo', () => {
	it('adapts a full channel response', () => {
		expect(adaptChannelInfo(buildChannelDetailsResponse())).toEqual({
			id: 'UCtest456',
			name: 'Test Channel',
			handle: '@TestChannel',
			avatarUrl: 'https://example.com/channel-avatar.jpg',
			bannerUrl: 'https://example.com/channel-banner.jpg',
			description: 'A test channel description',
			subscriberCount: '20,600,000',
			videoCount: 0,
			verified: true
		});
	});

	it('matches the channelDetails round-trip fixture', () => {
		const result = adaptChannelInfo(
			channelDetailsResponseFixture as unknown as ChannelInfoApiResponse,
			42
		);
		expect(result).toEqual({ ...channelDetailsFixture, videoCount: 42 });
	});

	describe('handle formatting', () => {
		it.each([
			['bare handle gets @ prefix', 'TestChannel', '@TestChannel'],
			['existing @ not doubled', '@TestChannel', '@TestChannel'],
			['empty handle falls back to id', '', '@UCtest456'],
			['missing handle falls back to id', undefined, '@UCtest456']
		])('%s', (_label, handle, expected) => {
			const result = adaptChannelInfo(buildChannelDetailsResponse({ handle }));
			expect(result.handle).toBe(expected);
		});
	});

	describe('avatar and banner selection', () => {
		it('selects the largest avatar by height', () => {
			const result = adaptChannelInfo(
				buildChannelDetailsResponse({
					avatars: [
						{ url: 'sm.jpg', width: 72, height: 72 },
						{ url: 'lg.jpg', width: 160, height: 160 },
						{ url: 'md.jpg', width: 120, height: 120 }
					]
				})
			);
			expect(result.avatarUrl).toBe('lg.jpg');
		});

		it('selects the widest banner', () => {
			const result = adaptChannelInfo(
				buildChannelDetailsResponse({
					banners: [
						{ url: 'b-1060.jpg', width: 1060, height: 175 },
						{ url: 'b-2560.jpg', width: 2560, height: 424 },
						{ url: 'b-2120.jpg', width: 2120, height: 351 }
					]
				})
			);
			expect(result.bannerUrl).toBe('b-2560.jpg');
		});

		it.each([
			[
				'empty avatars → raw avatarUrl',
				{ avatars: [], avatarUrl: 'raw-avatar.jpg' },
				'avatarUrl',
				'raw-avatar.jpg'
			],
			[
				'undefined avatars → raw avatarUrl',
				{ avatars: undefined, avatarUrl: 'raw-avatar.jpg' },
				'avatarUrl',
				'raw-avatar.jpg'
			],
			[
				'empty banners → raw bannerUrl',
				{ banners: [], bannerUrl: 'raw-banner.jpg' },
				'bannerUrl',
				'raw-banner.jpg'
			],
			[
				'undefined banners → raw bannerUrl',
				{ banners: undefined, bannerUrl: 'raw-banner.jpg' },
				'bannerUrl',
				'raw-banner.jpg'
			]
		])('%s', (_label, overrides, field, expected) => {
			const result = adaptChannelInfo(buildChannelDetailsResponse(overrides));
			expect(result[field as 'avatarUrl' | 'bannerUrl']).toBe(expected);
		});
	});

	describe('fallbacks', () => {
		it.each([
			['empty name', { name: '' }, 'name', 'Unknown Channel'],
			['empty description', { description: '' }, 'description', ''],
			['missing description → undefined', { description: undefined }, 'description', undefined],
			['missing subscriberCount → "0"', { subscriberCount: undefined }, 'subscriberCount', '0'],
			['missing verified → false', { verified: undefined }, 'verified', false]
		])('%s', (_label, overrides, field, expected) => {
			const result = adaptChannelInfo(buildChannelDetailsResponse(overrides));
			expect(result[field as keyof typeof result]).toBe(expected);
		});
	});

	it('passes videoCount through', () => {
		expect(adaptChannelInfo(buildChannelDetailsResponse(), 42).videoCount).toBe(42);
	});
});

describe('adaptChannelTabs', () => {
	const tab = (name: string) => ({ url: '', id: 'UCtest456', contentFilters: [name] });

	it('lists the supported tabs the channel has, in display order', () => {
		const tabs = [tab('playlists'), tab('shorts'), tab('videos'), tab('podcasts')];

		expect(adaptChannelTabs(tabs)).toEqual(['videos', 'shorts', 'playlists']);
	});

	it.each([
		['no tabs', []],
		['missing tabs', undefined]
	])('falls back to the videos tab for %s', (_label, tabs) => {
		expect(adaptChannelTabs(tabs)).toEqual(['videos']);
	});
});

describe('adaptChannelTab', () => {
	it('adapts each item by its infoType and drops types it does not know', () => {
		const response = buildChannelTabResponse({
			items: [
				buildRelatedItem(),
				buildChannelPlaylistItem(),
				{
					infoType: 'CHANNEL',
					url: 'https://www.youtube.com/channel/UCfeatured',
					name: 'Featured Channel',
					description: null,
					subscriberCount: 1200,
					streamCount: -1,
					verified: true,
					thumbnails: []
				},
				{ ...buildRelatedItem(), infoType: 'COMMENT' }
			]
		});

		const { items } = adaptChannelTab(response, thumbnailFallback, avatarFallback);

		expect(items).toEqual([
			expect.objectContaining({ type: 'video', id: 'video1', isLive: false }),
			{
				type: 'playlist',
				id: 'PLtest123',
				title: 'Test Playlist',
				thumbnail: 'https://example.com/playlist.jpg',
				streamCount: 8,
				uploaderId: 'UCtest456',
				uploaderName: 'Test Channel'
			},
			{
				type: 'channel',
				id: 'UCfeatured',
				name: 'Featured Channel',
				avatar: avatarFallback,
				subscriberCount: 1200,
				verified: true
			}
		]);
	});

	it.each([
		['unknown count', { streamCount: -1 }, 'streamCount', 0],
		['missing thumbnails', { thumbnails: [] }, 'thumbnail', thumbnailFallback],
		['missing uploader', { uploaderName: null, uploaderUrl: null }, 'uploaderId', '']
	])('falls back for a playlist with %s', (_label, override, field, expected) => {
		const response = buildChannelTabResponse({ items: [buildChannelPlaylistItem(override)] });

		const [playlist] = adaptChannelTab(response, thumbnailFallback, avatarFallback).items;

		expect(playlist[field as keyof typeof playlist]).toBe(expected);
	});

	it.each([
		['livestreams', -1, true],
		['livestreams', 3600, false],
		['shorts', -1, false]
	])('on the %s tab a stream with duration %d has isLive %s', (tab, duration, isLive) => {
		const response = buildChannelTabResponse({ tab, items: [buildRelatedItem({ duration })] });

		const [video] = adaptChannelTab(response, thumbnailFallback, avatarFallback).items;

		expect(video).toMatchObject({ type: 'video', isLive });
	});

	it('returns an empty page, not an error, for an empty tab', () => {
		const response = buildChannelTabResponse({ items: [], nextPage: null });

		expect(adaptChannelTab(response, thumbnailFallback, avatarFallback)).toEqual({
			items: [],
			nextPage: null
		});
		expect(adaptChannelTab(null, thumbnailFallback, avatarFallback)).toEqual({
			items: [],
			nextPage: null
		});
	});

	it('passes the continuation page through', () => {
		const nextPage = { url: 'https://example.com/browse', body: 'token', ids: ['a', 'b', 'c'] };
		const response = buildChannelTabResponse({ nextPage });

		expect(adaptChannelTab(response, thumbnailFallback, avatarFallback).nextPage).toEqual(nextPage);
	});
});

describe('adaptChannelVideos', () => {
	it('adapts a single item with all fields mapped', () => {
		const response = buildChannelVideosResponse({ items: [buildRelatedItem()] });

		const result: ChannelVideoPage = adaptChannelVideos(
			response,
			thumbnailFallback,
			avatarFallback
		);

		expect(result.items).toHaveLength(1);
		expect(result.items[0]).toEqual({
			type: 'video',
			id: 'video1',
			title: 'Test Video',
			thumbnail: 'https://example.com/v1.jpg',
			uploaderName: 'Test Channel',
			uploaderUrl: 'https://www.youtube.com/channel/UCtest456',
			uploadedDate: '2 weeks ago',
			duration: 120,
			viewCount: 1000,
			isShort: false,
			isLive: false
		});
	});

	it('matches the channelVideos round-trip fixture', () => {
		const result = adaptChannelVideos(
			channelVideosResponseFixture as unknown as ChannelVideosApiResponse,
			thumbnailFallback,
			avatarFallback
		);
		expect(result).toEqual(channelVideosFixture);
	});

	it('uses the LAST thumbnail (largest by API convention)', () => {
		const response = buildChannelVideosResponse({
			items: [
				buildRelatedItem({
					thumbnails: [
						{ url: 'sm.jpg', width: 168, height: 94 },
						{ url: 'lg.jpg', width: 336, height: 188 }
					]
				})
			]
		});
		expect(adaptChannelVideos(response, thumbnailFallback, avatarFallback).items[0].thumbnail).toBe(
			'lg.jpg'
		);
	});

	describe('fallbacks and clamping', () => {
		it.each([
			['empty title', { name: '' }, 'title', 'Untitled'],
			['missing thumbnails', { thumbnails: undefined }, 'thumbnail', thumbnailFallback],
			['empty thumbnails', { thumbnails: [] }, 'thumbnail', thumbnailFallback],
			['empty uploaderName', { uploaderName: '' }, 'uploaderName', 'Unknown'],
			['empty uploaderUrl → avatar fallback', { uploaderUrl: '' }, 'uploaderUrl', avatarFallback],
			['empty upload date', { textualUploadDate: '' }, 'uploadedDate', ''],
			['negative duration', { duration: -1 }, 'duration', 0],
			['missing duration', { duration: undefined }, 'duration', 0],
			['negative viewCount', { viewCount: -50 }, 'viewCount', 0]
		])('%s', (_label, override, field, expected) => {
			const response = buildChannelVideosResponse({ items: [buildRelatedItem(override)] });
			const { items } = adaptChannelVideos(response, thumbnailFallback, avatarFallback);
			const [video] = items;
			expect(video[field as keyof ChannelVideoConfig]).toBe(expected);
		});
	});

	describe('continuation', () => {
		it('passes the continuation page through', () => {
			const result = adaptChannelVideos(
				channelVideosResponseFixture as unknown as ChannelVideosApiResponse,
				thumbnailFallback,
				avatarFallback
			);
			expect(result.nextPage?.ids).toEqual([
				'GLITCH',
				'https://www.youtube.com/channel/glitch-channel-id',
				'VERIFIED'
			]);
		});

		it('returns null nextPage when the continuation is exhausted', () => {
			const response = buildChannelVideosResponse({ nextPage: { url: '', body: '', ids: [] } });
			expect(adaptChannelVideos(response, thumbnailFallback, avatarFallback).nextPage).toBeNull();
		});
	});

	it.each([
		['null response', null],
		['missing items', buildChannelVideosResponse({ items: undefined })]
	])('returns [] for %s', (_label, input) => {
		expect(adaptChannelVideos(input as never, thumbnailFallback, avatarFallback)).toEqual({
			items: [],
			nextPage: null
		});
	});
});
