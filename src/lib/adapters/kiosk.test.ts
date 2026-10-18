/**
 * Test Suite: kiosk.ts
 *
 * Tests for kiosk videos adaptation
 */

import { describe, it, expect } from 'vitest';
import { buildKioskItem } from '../../tests/fixtures/builder';
import kioskVideosResponseFixture from '../../tests/fixtures/api/kioskVideosApiResponse.json';
import KioskVideosFixture from '../../tests/fixtures/adapters/kioskVideosAdaptedResponse.json';
import { adaptKioskVideos, type KioskVideoConfig } from '$lib/adapters/kiosk';
import type { KioskApiResponseItem } from '$lib/api/kiosk';

const defaultThumbnail = 'fallback-thumb.jpg';
const defaultAvatar = 'fallback-avatar.jpg';

const adapt = (items: KioskApiResponseItem[] | undefined) =>
	adaptKioskVideos(items, defaultThumbnail, defaultAvatar);

describe('adaptKioskVideos', () => {
	it('adapts a single item with all fields mapped', () => {
		const result: KioskVideoConfig[] = adapt([buildKioskItem()]);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			id: 'video1',
			url: 'https://www.youtube.com/watch?v=video1',
			title: 'Test Video',
			thumbnail: 'https://example.com/v1.jpg',
			channelAvatar: 'fallback-avatar.jpg',
			channelId: 'UCtest456',
			channelName: 'Test Channel',
			viewCount: 1000,
			duration: 120,
			uploadDate: '2 weeks ago'
		});
	});

	it('matches the kiosk video round-trip fixture', () => {
		const result = adapt(kioskVideosResponseFixture.items as KioskApiResponseItem[]);
		expect(result).toEqual(KioskVideosFixture);
	});

	describe('invalid item filtering', () => {
		it.each([
			['missing url', buildKioskItem({ url: '' })],
			['missing name', buildKioskItem({ name: '' })]
		])('drops item with %s', (_label, invalidItem) => {
			const result = adapt([invalidItem, buildKioskItem({ name: 'Survivor' })]);
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Survivor');
		});
	});

	describe('fallbacks and clamping', () => {
		it.each([
			['empty uploaderName', { uploaderName: '' }, 'channelName', 'Unknown Channel'],
			['empty thumbnails', { thumbnails: [] }, 'thumbnail', defaultThumbnail],
			['missing thumbnails', { thumbnails: undefined }, 'thumbnail', defaultThumbnail],
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
			const [video] = adapt([buildKioskItem(override as never)]);
			expect(video[field as keyof KioskVideoConfig]).toBe(expected);
		});
	});

	it.each([
		['undefined', undefined],
		['empty array', []]
	])('returns [] for %s input', (_label, input) => {
		expect(adapt(input)).toEqual([]);
	});
});
