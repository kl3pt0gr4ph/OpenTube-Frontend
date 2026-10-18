/**
 * Test Suite: metadata.ts
 *
 * Tests for video metadata adaptation
 */
import { describe, it, expect } from 'vitest';
import { adaptVideoMetadata } from './metadata';
import { buildVideoDetails } from '../../tests/fixtures/builder';
import detailsResponseFixture from '../../tests/fixtures/api/detailsResponseFixture.json';
import detailsResultFixture from '../../tests/fixtures/adapters/detailsResult.json';
import type { Details } from '#lib/types.js';

const defaultAvatar = 'https://example.com/default-avatar.jpg';

describe('adaptVideoMetadata', () => {
	it('adapts complete video details with all fields mapped', () => {
		expect(adaptVideoMetadata(buildVideoDetails(), defaultAvatar)).toEqual({
			title: 'Test Video Title',
			description: 'A test video description',
			channelName: 'Test Channel',
			// single-avatar builder default: real selectBestAvatar returns [0]
			channelAvatar: 'https://example.com/uploader-avatar.jpg',
			viewCount: 10_000,
			uploadDate: '2021-10-29T16:00:13-07:00',
			likeCount: 555,
			dislikeCount: 10,
			subscriberCount: 50_000
		});
	});

	it('matches the detailsResult round-trip fixture on real-shaped data', () => {
		const result = adaptVideoMetadata(detailsResponseFixture[0] as Details, defaultAvatar);
		expect(result).toEqual(detailsResultFixture[0]);
	});

	describe('fallbacks', () => {
		it.each([
			['empty title', { videoTitle: '' }, 'title', 'Untitled Video'],
			[
				'missing description',
				{ description: undefined },
				'description',
				'No description available'
			],
			[
				'empty description content',
				{ description: { content: '', type: 1 } },
				'description',
				'No description available'
			],
			['empty channel name', { channelName: '' }, 'channelName', 'Unknown Channel'],
			['missing upload date', { uploadDate: '' }, 'uploadDate', ''],
			['empty avatars', { uploaderAvatars: [] }, 'channelAvatar', defaultAvatar],
			['missing avatars', { uploaderAvatars: undefined }, 'channelAvatar', defaultAvatar]
		])('%s', (_label, override, field, expected) => {
			const result = adaptVideoMetadata(buildVideoDetails(override) as Details, defaultAvatar);
			expect(result[field as keyof typeof result]).toBe(expected);
		});
	});

	describe('count clamping', () => {
		it.each([
			['negative viewCount', { viewCount: -1 }, 'viewCount', 0],
			['null viewCount', { viewCount: null }, 'viewCount', 0],
			['negative likeCount', { likeCount: -1 }, 'likeCount', 0],
			['null likeCount', { likeCount: null }, 'likeCount', 0],
			['negative dislikeCount', { dislikeCount: -1 }, 'dislikeCount', 0],
			['negative subscriberCount', { channelSubscriberCount: -1 }, 'subscriberCount', 0],
			['null subscriberCount', { channelSubscriberCount: null }, 'subscriberCount', 0],
			['large viewCount preserved', { viewCount: 999_999_999_999 }, 'viewCount', 999_999_999_999],
			['large likeCount preserved', { likeCount: 10_000_000 }, 'likeCount', 10_000_000]
		])('%s', (_label, override, field, expected) => {
			const result = adaptVideoMetadata(
				buildVideoDetails(override as never) as Details,
				defaultAvatar
			);
			expect(result[field as keyof typeof result]).toBe(expected);
		});
	});
});
