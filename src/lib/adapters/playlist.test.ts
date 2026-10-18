/**
 * Test Suite: playlist.ts (adapter)
 *
 * Tests for playlist info and playlist video adaptation, including
 * banner/thumbnail/avatar selection, fallback handling, and value clamping
 */

import { describe, it, expect } from 'vitest';
import { adaptPlaylistInfo, adaptPlaylistVideos, type PlaylistInfoConfig } from './playlist';
import { buildPlaylistResponse, buildRelatedItem } from '../../tests/fixtures/builder';
import logoPlaceholder from '#lib/assets/placeholders/logofallback.svg?raw';
import thumbnailFallback from '#lib/assets/placeholders/thumbnailFallback.svg?raw';
import bannerPlaceholder from '#lib/assets/placeholders/bannerFallback.svg?raw';
import type { PlaylistApiResponse } from '#lib/api/playlist.js';
import type { RelatedVideoConfig } from '#lib/adapters/related.js';

describe('adaptPlaylistInfo', () => {
	it('adapts a full playlist response to PlaylistInfoConfig', () => {
		const result: PlaylistInfoConfig = adaptPlaylistInfo(buildPlaylistResponse());

		expect(result).toEqual({
			id: 'PLtest123',
			name: 'Test Playlist',
			url: 'https://www.youtube.com/playlist?list=PLtest123',
			uploaderName: 'Test Channel',
			uploaderId: 'UCtest456',
			uploaderAvatarUrl: 'https://example.com/avatar.jpg',
			bannerUrl: 'https://example.com/banner.jpg',
			thumbnailUrl: 'https://example.com/thumb.jpg',
			uploaderUrl: 'https://www.youtube.com/channel/UCtest456',
			description: 'A test playlist description'
		});
	});

	it('extracts the uploader ID from the uploader URL', () => {
		const result = adaptPlaylistInfo(
			buildPlaylistResponse({ uploaderUrl: 'https://www.youtube.com/channel/UCabc789' })
		);
		expect(result.uploaderId).toBe('UCabc789');
	});

	describe('banner selection', () => {
		it.each([
			[
				'widest of several',
				[
					{ url: 'https://example.com/banner-640.jpg', width: 640, height: 360 },
					{ url: 'https://example.com/banner-2560.jpg', width: 2560, height: 1280 },
					{ url: 'https://example.com/banner-1060.jpg', width: 1060, height: 800 }
				],
				'https://example.com/banner-2560.jpg'
			],
			[
				'single banner',
				[{ url: 'https://example.com/only.jpg', width: 1060, height: 640 }],
				'https://example.com/only.jpg'
			],
			['empty array', [], bannerPlaceholder],
			['undefined', undefined, bannerPlaceholder]
		])('%s → %j', (_label, banners, expected) => {
			const result = adaptPlaylistInfo(buildPlaylistResponse({ banners }));
			expect(result.bannerUrl).toBe(expected);
		});

		it('does not mutate the original banners array when sorting', () => {
			const banners = [
				{ url: 'https://example.com/banner-small.jpg', width: 640, height: 360 },
				{ url: 'https://example.com/banner-large.jpg', width: 2120, height: 1280 }
			];
			adaptPlaylistInfo(buildPlaylistResponse({ banners }));

			expect(banners[0].url).toBe('https://example.com/banner-small.jpg');
			expect(banners[1].url).toBe('https://example.com/banner-large.jpg');
		});
	});

	describe('description handling', () => {
		it.each([
			['populated content', { content: 'My description', type: 1 }, 'My description'],
			['empty content', { content: '', type: 1 }, null],
			['undefined description', undefined, null],
			['object without content', {} as never, null]
		])('%s → %j', (_label, description, expected) => {
			const result = adaptPlaylistInfo(buildPlaylistResponse({ description }));
			expect(result.description).toBe(expected);
		});
	});
});

describe('adaptPlaylistVideos', () => {
	it('adapts a single video with all fields mapped', () => {
		const response = buildPlaylistResponse({ relatedItems: [buildRelatedItem()] });

		const result: RelatedVideoConfig[] = adaptPlaylistVideos(response);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			type: 'video',
			id: 'video1',
			url: 'https://www.youtube.com/watch?v=video1',
			title: 'Test Video',
			thumbnail: 'https://example.com/v1.jpg',
			channelName: 'Test Channel',
			channelId: 'UCtest456',
			channelAvatar: 'https://example.com/avatar.jpg',
			duration: 120,
			viewCount: 1000,
			uploadDate: '2 weeks ago'
		});
	});

	it('adapts every related item and preserves order', () => {
		const response = buildPlaylistResponse({
			relatedItems: [
				buildRelatedItem({ name: 'Video One' }),
				buildRelatedItem({ name: 'Video Two' }),
				buildRelatedItem({ name: 'Video Three' })
			]
		});

		const titles = adaptPlaylistVideos(response).map((v) => v.title);
		expect(titles).toEqual(['Video One', 'Video Two', 'Video Three']);
	});

	describe('fallback handling', () => {
		it.each([
			['missing name', { name: undefined }, 'title', 'Untitled'],
			['empty name', { name: '' }, 'title', 'Untitled'],
			['missing uploader name', { uploaderName: undefined }, 'channelName', 'Unknown'],
			['missing thumbnails', { thumbnails: undefined }, 'thumbnail', thumbnailFallback],
			['missing avatars', { uploaderAvatars: undefined }, 'channelAvatar', logoPlaceholder]
		])('%s → %s = %j', (_label, override, field, expected) => {
			const response = buildPlaylistResponse({ relatedItems: [buildRelatedItem(override)] });
			const [video] = adaptPlaylistVideos(response);
			expect(video[field as keyof RelatedVideoConfig]).toBe(expected);
		});
	});

	describe('numeric value clamping', () => {
		it.each([
			['negative duration', { duration: -1 }, 'duration', 0],
			['missing duration', { duration: undefined }, 'duration', 0],
			['negative view count', { viewCount: -50 }, 'viewCount', 0],
			['missing view count', { viewCount: undefined }, 'viewCount', 0],
			['positive duration preserved', { duration: 3600 }, 'duration', 3600],
			['positive view count preserved', { viewCount: 1_000_000 }, 'viewCount', 1_000_000]
		])('%s → %s = %d', (_label, override, field, expected) => {
			const response = buildPlaylistResponse({ relatedItems: [buildRelatedItem(override)] });
			const [video] = adaptPlaylistVideos(response);
			expect(video[field as keyof RelatedVideoConfig]).toBe(expected);
		});
	});

	describe('empty and missing input', () => {
		it.each([
			['relatedItems undefined', buildPlaylistResponse({ relatedItems: undefined })],
			['relatedItems empty', buildPlaylistResponse({ relatedItems: [] })],
			['response null', null as unknown as PlaylistApiResponse],
			['response undefined', undefined as unknown as PlaylistApiResponse]
		])('returns [] for %s', (_label, input) => {
			expect(adaptPlaylistVideos(input)).toEqual([]);
		});
	});

	it('does not modify the input response', () => {
		const response = buildPlaylistResponse({
			relatedItems: [buildRelatedItem({ duration: -5 })]
		});
		adaptPlaylistVideos(response);
		expect(response.relatedItems?.[0].duration).toBe(-5);
	});
});
