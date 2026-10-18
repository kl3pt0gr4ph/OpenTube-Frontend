/**
 * Test Suite: related.ts
 *
 * Tests for related-item adaptation (video, playlist, channel).
 */

import { describe, it, expect } from 'vitest';
import {
	adaptRelatedItems,
	type RelatedVideoConfig,
	type RelatedPlaylistConfig,
	type RelatedChannelConfig
} from './related';
import { buildRelatedItem, buildThumbnail } from '../../tests/fixtures/builder';
import relatedVideosResponseFixture from '../../tests/fixtures/api/relatedVideosResponse.json';
import relatedVideosFixture from '../../tests/fixtures/adapters/relatedVideosAdaptedResponse.json';
import type { RelatedItemApiResponse } from '#lib/api/related.js';

const defaultThumbnail = 'fallback-thumb.jpg';
const defaultAvatar = 'fallback-avatar.jpg';

const adapt = (items: RelatedItemApiResponse[] | null) =>
	adaptRelatedItems(items, defaultThumbnail, defaultAvatar);

describe('adaptRelatedItems', () => {
	describe('video items', () => {
		it('adapts a single item with all fields mapped', () => {
			const result = adapt([buildRelatedItem()]);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				type: 'video',
				id: 'video1',
				url: 'https://www.youtube.com/watch?v=video1',
				title: 'Test Video',
				thumbnail: 'https://example.com/v1.jpg',
				channelName: 'Test Channel',
				channelAvatar: 'https://example.com/avatar.jpg',
				viewCount: 1000,
				duration: 120,
				uploadDate: '2 weeks ago',
				channelId: 'UCtest456'
			});
		});

		it('matches the relatedVideos round-trip fixture (includes filtering the invalid row)', () => {
			const result = adapt(relatedVideosResponseFixture as unknown as RelatedItemApiResponse[]);
			expect(result).toEqual(relatedVideosFixture);
		});

		describe('fallbacks and clamping', () => {
			it.each([
				['empty uploaderName', { uploaderName: '' }, 'channelName', ''],
				['empty thumbnails', { thumbnails: [] }, 'thumbnail', defaultThumbnail],
				['missing thumbnails', { thumbnails: undefined }, 'thumbnail', defaultThumbnail],
				['empty avatars', { uploaderAvatars: [] }, 'channelAvatar', defaultAvatar],
				['missing avatars', { uploaderAvatars: undefined }, 'channelAvatar', defaultAvatar],
				['empty upload date', { textualUploadDate: '' }, 'uploadDate', ''],
				['negative viewCount', { viewCount: -1 }, 'viewCount', 0],
				['missing viewCount', { viewCount: undefined }, 'viewCount', 0],
				['negative duration', { duration: -1 }, 'duration', 0],
				['missing duration', { duration: undefined }, 'duration', 0],
				[
					'positive counts preserved',
					{ viewCount: 39_000_000, duration: 1049 },
					'viewCount',
					39_000_000
				]
			])('%s', (_label, override, field, expected) => {
				const [video] = adapt([buildRelatedItem(override as never)]);
				expect((video as RelatedVideoConfig)[field as keyof RelatedVideoConfig]).toBe(expected);
			});
		});
	});

	describe('playlist items', () => {
		it('adapts a single item with all fields mapped', () => {
			const item = buildRelatedItem({
				infoType: 'PLAYLIST',
				url: 'https://www.youtube.com/playlist?list=PLtest123',
				name: 'Test Playlist',
				thumbnails: [buildThumbnail({ url: 'https://example.com/playlist-thumb.jpg' })],
				uploaderName: 'Test Channel',
				uploaderUrl: 'https://www.youtube.com/channel/UCtest456',
				streamCount: 12
			});

			const [result] = adapt([item]);

			expect(result).toEqual({
				type: 'playlist',
				id: 'PLtest123',
				title: 'Test Playlist',
				thumbnail: 'https://example.com/playlist-thumb.jpg',
				streamCount: 12,
				uploaderId: 'UCtest456',
				uploaderName: 'Test Channel'
			});
		});

		it.each([
			['a negative streamCount', -5],
			['a missing streamCount', undefined]
		])('clamps %s to 0', (_label, streamCount) => {
			const [result] = adapt([
				buildRelatedItem({
					infoType: 'PLAYLIST',
					url: 'https://www.youtube.com/playlist?list=PLtest123',
					streamCount
				})
			]);
			expect((result as RelatedPlaylistConfig).streamCount).toBe(0);
		});
	});

	describe('channel items', () => {
		it('adapts a single item with all fields mapped', () => {
			const item = buildRelatedItem({
				infoType: 'CHANNEL',
				url: 'https://www.youtube.com/channel/UCtest456',
				name: 'Test Channel',
				thumbnails: [buildThumbnail({ url: 'https://example.com/channel-avatar.jpg' })],
				subscriberCount: 20_600_000,
				verified: true
			});

			const [result] = adapt([item]);

			expect(result).toEqual({
				type: 'channel',
				id: 'UCtest456',
				name: 'Test Channel',
				avatar: 'https://example.com/channel-avatar.jpg',
				subscriberCount: 20_600_000,
				verified: true
			});
		});

		it('clamps a negative subscriberCount to 0', () => {
			const [result] = adapt([
				buildRelatedItem({
					infoType: 'CHANNEL',
					url: 'https://www.youtube.com/channel/UCtest456',
					subscriberCount: -10
				})
			]);
			expect((result as RelatedChannelConfig).subscriberCount).toBe(0);
		});

		it('defaults verified to false when omitted', () => {
			const [result] = adapt([
				buildRelatedItem({
					infoType: 'CHANNEL',
					url: 'https://www.youtube.com/channel/UCtest456'
				})
			]);
			expect((result as RelatedChannelConfig).verified).toBe(false);
		});
	});

	describe('dispatch and invalid-item handling', () => {
		it('routes each item to its type and drops an unrecognized infoType', () => {
			const items = [
				buildRelatedItem({ infoType: 'STREAM' }),
				buildRelatedItem({
					infoType: 'PLAYLIST',
					url: 'https://www.youtube.com/playlist?list=PLtest123',
					streamCount: 5
				}),
				buildRelatedItem({
					infoType: 'CHANNEL',
					url: 'https://www.youtube.com/channel/UCtest456',
					subscriberCount: 100
				}),
				buildRelatedItem({ infoType: 'RADIO' })
			];

			const result = adapt(items);

			expect(result.map((item) => item.type)).toEqual(['video', 'playlist', 'channel']);
		});

		it.each([
			['missing url', buildRelatedItem({ url: '' })],
			['missing name', buildRelatedItem({ name: '' })]
		])('drops item with %s', (_label, invalidItem) => {
			const result = adapt([invalidItem, buildRelatedItem({ name: 'Survivor' })]);
			expect(result).toHaveLength(1);
			expect((result[0] as RelatedVideoConfig).title).toBe('Survivor');
		});

		it('drops an item when no id can be extracted from an otherwise-valid url', () => {
			const result = adapt([buildRelatedItem({ url: 'https://www.youtube.com' })]);
			expect(result).toEqual([]);
		});
	});

	it.each([
		['null', null],
		['empty array', []]
	])('returns [] for %s input', (_label, input) => {
		expect(adapt(input)).toEqual([]);
	});
});
