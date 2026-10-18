/**
 * Test Suite: search.ts
 *
 * Tests for search results adaptation — covers stream, channel, and playlist types.
 */
import { describe, it, expect } from 'vitest';
import { adaptSearchResults } from './search';
import {
	buildSearchResponse,
	buildSearchStreamItem,
	buildSearchChannelItem,
	buildSearchPlaylistItem
} from '../../tests/fixtures/builder';
import searchResponseFixture from '../../tests/fixtures/api/searchApiResponse.json';
import searchResultFixture from '../../tests/fixtures/adapters/searchAdaptedResponse.json';

import type { SearchApiResponse } from '#lib/api/search.js';

const defaultThumbnail = 'default-thumbnail.jpg';
const defaultAvatar = 'default-avatar.jpg';

const adapt = (input: unknown) =>
	adaptSearchResults(input as SearchApiResponse, defaultThumbnail, defaultAvatar);

describe('adaptSearchResults', () => {
	it('adapts a stream item with all fields mapped', () => {
		const result = adapt(buildSearchResponse({ items: [buildSearchStreamItem()] } as never));

		expect(result.items).toHaveLength(1);
		expect(result.items[0]).toEqual({
			type: 'stream',
			description: 'A test video description',
			id: 'video1',
			url: 'https://www.youtube.com/watch?v=video1',
			title: 'Test Video',
			thumbnail: 'https://i.ytimg.com/vi/video1/hq720.jpg',
			channelName: 'Test Channel',
			channelUrl: 'https://www.youtube.com/channel/UCtest456',
			channelAvatar: 'https://yt3.ggpht.com/search-avatar.jpg',
			verified: true,
			viewCount: 1000,
			duration: 86,
			uploadDate: '2025-11-13T16:00Z'
		});
	});

	it('adapts a channel item with all fields mapped', () => {
		const result = adapt(buildSearchResponse({ items: [buildSearchChannelItem()] } as never));

		expect(result.items[0]).toEqual({
			type: 'channel',
			id: 'UCtest456',
			name: 'Test Channel',
			avatar: 'https://yt.ggpht.com/channel-avatar.jpg',
			description: 'A test channel description',
			subscriberCount: 20_600_000,
			verified: true
		});
	});

	it('adapts a playlist item with all fields mapped', () => {
		const result = adapt(buildSearchResponse({ items: [buildSearchPlaylistItem()] } as never));

		expect(result.items[0]).toEqual({
			type: 'playlist',
			id: 'PLtest123',
			url: 'https://www.youtube.com/playlist?list=PLtest123',
			title: 'Test Playlist',
			thumbnail: 'https://i.ytimg.com/vi/PLtest123/hq720.jpg',
			uploaderName: 'Test Channel',
			uploaderUrl: 'https://www.youtube.com/channel/UCtest456',
			videoCount: 8
		});
	});

	it('discriminates mixed item types and preserves order', () => {
		const result = adapt(
			buildSearchResponse({
				items: [buildSearchStreamItem(), buildSearchChannelItem(), buildSearchPlaylistItem()]
			} as never)
		);
		expect(result.items.map((r) => r.type)).toEqual(['stream', 'channel', 'playlist']);
	});

	it('treats an empty type as a stream', () => {
		const result = adapt(
			buildSearchResponse({ items: [buildSearchStreamItem({ type: '' })] } as never)
		);
		expect(result.items[0].type).toBe('stream');
	});

	it('matches the searchResult round-trip fixture (includes filtering the invalid row)', () => {
		const result = adapt(searchResponseFixture);
		expect(result).toEqual(searchResultFixture);
	});

	describe('invalid item filtering', () => {
		it.each([
			['missing url', buildSearchStreamItem({ url: '' })],
			['missing name', buildSearchStreamItem({ name: '' })]
		])('drops item with %s', (_label, invalidItem) => {
			const result = adapt(
				buildSearchResponse({
					items: [invalidItem, buildSearchStreamItem({ name: 'Survivor' })]
				} as never)
			);
			expect(result.items).toHaveLength(1);
		});

		it('drops null entries in the items array', () => {
			const result = adapt(
				buildSearchResponse({
					items: [null, buildSearchStreamItem()]
				} as never)
			);
			expect(result.items).toHaveLength(1);
		});
	});

	describe('fallbacks and clamping', () => {
		it.each([
			['stream: empty description', buildSearchStreamItem({ description: '' }), 'description', ''],
			['stream: empty uploaderUrl', buildSearchStreamItem({ uploaderUrl: '' }), 'channelUrl', ''],
			[
				'stream: undefined verified',
				buildSearchStreamItem({ uploaderVerified: undefined }),
				'verified',
				false
			],
			[
				'stream: undefined viewCount',
				buildSearchStreamItem({ viewCount: undefined }),
				'viewCount',
				0
			],
			[
				'stream: empty thumbnail',
				buildSearchStreamItem({ thumbnailUrl: '' }),
				'thumbnail',
				defaultThumbnail
			],
			[
				'stream: empty avatar',
				buildSearchStreamItem({ uploaderAvatarUrl: '' }),
				'channelAvatar',
				defaultAvatar
			],
			[
				'stream: empty uploaderName',
				buildSearchStreamItem({ uploaderName: '' }),
				'channelName',
				'Unknown Channel'
			],
			['stream: negative viewCount', buildSearchStreamItem({ viewCount: -1 }), 'viewCount', 0],
			['stream: negative duration', buildSearchStreamItem({ duration: -1 }), 'duration', 0],
			['stream: empty uploadDate', buildSearchStreamItem({ uploadDate: '' }), 'uploadDate', ''],
			[
				'channel: empty avatar',
				buildSearchChannelItem({ thumbnailUrl: '' }),
				'avatar',
				defaultAvatar
			],
			[
				'channel: empty description → null',
				buildSearchChannelItem({ description: '' }),
				'description',
				null
			],
			[
				'channel: negative subscriberCount',
				buildSearchChannelItem({ subscriberCount: -1 }),
				'subscriberCount',
				0
			],
			[
				'channel: undefined verified',
				buildSearchChannelItem({ uploaderVerified: undefined }),
				'verified',
				false
			],
			[
				'channel: undefined subscriberCount',
				buildSearchChannelItem({ subscriberCount: undefined }),
				'subscriberCount',
				0
			],
			[
				'playlist: empty thumbnail',
				buildSearchPlaylistItem({ thumbnailUrl: '' }),
				'thumbnail',
				defaultThumbnail
			],
			[
				'playlist: negative videoCount',
				buildSearchPlaylistItem({ videoCount: -1 }),
				'videoCount',
				0
			],
			[
				'playlist: empty uploaderName',
				buildSearchPlaylistItem({ uploaderName: '' }),
				'uploaderName',
				'Unknown'
			],
			[
				'playlist: empty uploaderUrl',
				buildSearchPlaylistItem({ uploaderUrl: '' }),
				'uploaderUrl',
				''
			],
			[
				'playlist: undefined videoCount',
				buildSearchPlaylistItem({ videoCount: undefined }),
				'videoCount',
				0
			]
		])('%s', (_label, item, field, expected) => {
			const [result] = adapt(buildSearchResponse({ items: [item] } as never)).items;
			expect(result[field as keyof typeof result]).toBe(expected);
		});
	});

	it.each([
		['undefined searchResult', undefined, undefined],
		['missing items', buildSearchResponse({ items: undefined } as never), true],
		['empty items', buildSearchResponse({ items: [] } as never), true]
	])('returns items: [] for %s', (_label, input, expectedHasNextPage) => {
		expect(adapt(input)).toEqual({
			items: [],
			nextPage: null,
			hasNextPage: expectedHasNextPage
		});
	});

	describe('adaptNextPage', () => {
		it('returns the next page url and id when hasNextPage is true', () => {
			const result = adapt(
				buildSearchResponse({
					items: [buildSearchStreamItem()],
					hasNextPage: true,
					nextPage: { url: 'https://www.youtube.com/search?prettyPrint=false', id: 'next-page-id' }
				} as never)
			);
			expect(result.nextPage).toEqual({
				url: 'https://www.youtube.com/search?prettyPrint=false',
				id: 'next-page-id'
			});
		});

		it('returns null when hasNextPage is false', () => {
			const result = adapt(
				buildSearchResponse({
					items: [buildSearchStreamItem()],
					hasNextPage: false,
					nextPage: { url: 'https://www.youtube.com/search?prettyPrint=false', id: 'next-page-id' }
				} as never)
			);
			expect(result.nextPage).toBeNull();
		});

		it('returns null when hasNextPage is true but nextPage is missing', () => {
			const result = adapt(
				buildSearchResponse({
					items: [buildSearchStreamItem()],
					hasNextPage: true,
					nextPage: undefined
				} as never)
			);
			expect(result.nextPage).toBeNull();
		});
	});
});
