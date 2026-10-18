/**
 * Shared test-data builders — one per API response type.
 * Defaults are modelled on the real fixtures in src/tests/fixtures/api/.
 */

import type { Avatar, Details, Image } from '#lib/types.js';
import type { SearchApiResponse } from '#lib/api/search.js';
import type { RelatedItemApiResponse } from '#lib/api/related.js';
import type { CommentApiResponse, RelatedCommentApiResponseItem } from '#lib/api/comments.js';
import type { ChannelInfoApiResponse, ChannelVideosApiResponse } from '#lib/api/channel.js';
import type { PlaylistApiResponse } from '#lib/api/playlist.js';
import type { KioskApiResponseItem } from '#lib/api/kiosk.js';

// ---------------------------------------------------------------------------
// Media primitives (exported — handy for mediaUtils/thumbnail tests too)
// ---------------------------------------------------------------------------

export const buildImage = (overrides: Partial<Image> = {}): Image =>
	({
		url: 'https://i.ytimg.com/vi/test-id/hqdefault.jpg',
		width: 336,
		height: 188,
		estimatedResolutionLevel: 'MEDIUM',
		...overrides
	}) as Image;

export const buildThumbnail = (overrides: Partial<Image> = {}): Image => buildImage(overrides);

export const buildAvatar = (overrides: Partial<Image> = {}): Avatar =>
	buildImage({
		url: 'https://yt3.ggpht.com/test-avatar.jpg',
		width: 88,
		height: 88,
		estimatedResolutionLevel: 'LOW',
		...overrides
	}) as Avatar;

// ---------------------------------------------------------------------------
// Streams / related items
// ---------------------------------------------------------------------------

export const buildRelatedItem = (
	overrides: Partial<RelatedItemApiResponse> = {}
): RelatedItemApiResponse =>
	({
		infoType: 'STREAM',
		serviceId: 0,
		url: 'https://www.youtube.com/watch?v=video1',
		name: 'Test Video',
		thumbnails: [buildThumbnail({ url: 'https://example.com/v1.jpg' })],
		streamType: 'VIDEO_STREAM',
		uploaderName: 'Test Channel',
		uploaderUrl: 'https://www.youtube.com/channel/UCtest456',
		uploaderAvatars: [
			buildAvatar({ url: 'https://example.com/avatar.jpg', width: 48, height: 48 })
		],
		duration: 120,
		viewCount: 1000,
		textualUploadDate: '2 weeks ago',
		uploadDate: { approximation: true },
		uploaderVerified: true,
		shortFormContent: false,
		isShortFormContent: false,
		...overrides
	}) as RelatedItemApiResponse;

// ---------------------------------------------------------------------------
// Playlist
// ---------------------------------------------------------------------------

export const buildPlaylistResponse = (
	overrides: Partial<PlaylistApiResponse> = {}
): PlaylistApiResponse =>
	({
		id: 'PLtest123',
		serviceId: 1,
		sortFilter: 'asc',
		name: 'Test Playlist',
		url: 'https://www.youtube.com/playlist?list=PLtest123',
		originalUrl: 'https://www.youtube.com/playlist?list=PLtest123',
		uploaderName: 'Test Channel',
		uploaderUrl: 'https://www.youtube.com/channel/UCtest456',
		uploaderVerified: true,
		uploaderAvatars: [
			buildAvatar({ url: 'https://example.com/avatar.jpg', width: 176, height: 176 })
		],
		banners: [{ url: 'https://example.com/banner.jpg', width: 1060, height: 175 }],
		thumbnails: [buildThumbnail({ url: 'https://example.com/thumb.jpg' })],
		description: {
			content: 'A test playlist description',
			type: 1
		},
		streamCount: 0,
		relatedItems: [],
		...overrides
	}) as PlaylistApiResponse;

// ---------------------------------------------------------------------------
// Channel — details + videos tab
// ---------------------------------------------------------------------------

export const buildChannelDetailsResponse = (
	overrides: Partial<ChannelInfoApiResponse> = {}
): ChannelInfoApiResponse => ({
	id: 'UCtest456',
	name: 'Test Channel',
	handle: 'TestChannel',
	subscriberCount: 20_600_000,
	description: 'A test channel description',
	verified: true,
	avatarUrl: '',
	bannerUrl: '',
	tabs: [],
	avatars: [
		buildAvatar({
			url: 'https://example.com/channel-avatar.jpg',
			height: 120,
			width: 120,
			estimatedResolutionLevel: 'MEDIUM'
		})
	],
	banners: [
		{
			url: 'https://example.com/channel-banner.jpg',
			height: 175,
			width: 1060,
			estimatedResolutionLevel: 'HIGH'
		}
	],
	...overrides
});

export const buildChannelVideosResponse = (
	overrides: Partial<ChannelVideosApiResponse> = {}
): ChannelVideosApiResponse =>
	({
		tab: 'videos',
		channelId: 'UCtest456',
		items: [buildRelatedItem()],
		...overrides
	}) as ChannelVideosApiResponse;

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export const buildCommentItem = (
	overrides: Partial<RelatedCommentApiResponseItem> = {}
): RelatedCommentApiResponseItem =>
	({
		infoType: 'COMMENT',
		serviceId: 0,
		url: 'https://www.youtube.com/watch?v=video1',
		name: '@TestUser',
		thumbnails: [
			buildThumbnail({ url: 'https://yt3.ggpht.com/comment-thumb.jpg', width: 88, height: 88 })
		],
		commentId: 'comment-test-id',
		commentText: 'A test comment',
		uploaderName: '@TestUser',
		uploaderAvatars: [buildAvatar()],
		uploaderUrl: 'https://www.youtube.com/channel/UCtest456',
		uploaderVerified: false,
		textualUploadDate: '2 years ago',
		uploadDate: { approximation: true },
		likeCount: 100,
		textualLikeCount: '100',
		heartedByUploader: false,
		pinned: false,
		streamPosition: -1,
		replyCount: 0,
		replies: undefined,
		channelOwner: false,
		...overrides
	}) as RelatedCommentApiResponseItem;

export const buildCommentResponse = (
	overrides: Partial<CommentApiResponse> = {}
): CommentApiResponse =>
	({
		serviceId: 0,
		id: 'video1',
		url: 'https://www.youtube.com/watch?v=video1',
		originalUrl: 'https://www.youtube.com/watch?v=video1',
		name: 'Comments',
		errors: [],
		relatedItems: [buildCommentItem()],
		...overrides
	}) as CommentApiResponse;

// ---------------------------------------------------------------------------
// Video details
// ---------------------------------------------------------------------------

export const buildVideoDetails = (overrides: Partial<Details> = {}): Details => ({
	videoTitle: 'Test Video Title',
	description: {
		content: 'A test video description',
		type: 1
	},
	uploaderAvatars: [
		buildAvatar({ url: 'https://example.com/uploader-avatar.jpg', width: 176, height: 176 })
	],
	viewCount: 10_000,
	likeCount: 555,
	dislikeCount: 10,
	channelName: 'Test Channel',
	channelSubscriberCount: 50_000,
	uploadDate: '2021-10-29T16:00:13-07:00',
	...overrides
});

// ---------------------------------------------------------------------------
// Search — three item variants (discriminated by `type`) + envelope
// ---------------------------------------------------------------------------

export const buildSearchStreamItem = (overrides: Record<string, unknown> = {}) => ({
	type: 'stream',
	name: 'Test Video',
	url: 'https://www.youtube.com/watch?v=video1',
	thumbnailUrl: 'https://i.ytimg.com/vi/video1/hq720.jpg',
	uploaderName: 'Test Channel',
	channelId: 'UCtest456',
	uploaderUrl: 'https://www.youtube.com/channel/UCtest456',
	uploaderAvatarUrl: 'https://yt3.ggpht.com/search-avatar.jpg',
	uploaderVerified: true,
	duration: 86,
	viewCount: 1000,
	uploadDate: '2025-11-13T16:00Z',
	description: 'A test video description',
	streamType: 'VIDEO_STREAM',
	shortFormContent: false,
	isShortFormContent: false,
	...overrides
});

export const buildSearchChannelItem = (overrides: Record<string, unknown> = {}) => ({
	type: 'channel',
	name: 'Test Channel',
	url: 'https://www.youtube.com/channel/UCtest456',
	thumbnailUrl: 'https://yt.ggpht.com/channel-avatar.jpg',
	uploaderVerified: true,
	subscriberCount: 20_600_000,
	streamCount: -1,
	description: 'A test channel description',
	...overrides
});

export const buildSearchPlaylistItem = (overrides: Record<string, unknown> = {}) => ({
	type: 'playlist',
	name: 'Test Playlist',
	url: 'https://www.youtube.com/playlist?list=PLtest123',
	thumbnailUrl: 'https://i.ytimg.com/vi/PLtest123/hq720.jpg',
	uploaderName: 'Test Channel',
	uploaderUrl: 'https://www.youtube.com/channel/UCtest456',
	playlistType: 'NORMAL',
	videoCount: 8,
	...overrides
});

export const buildSearchResponse = (
	overrides: Partial<SearchApiResponse> = {}
): SearchApiResponse =>
	({
		correctedSearch: false,
		isCorrectedSearch: false,
		url: 'https://www.youtube.com/search?q=test',
		originalUrl: 'https://www.youtube.com/search?q=test',
		name: 'Search',
		searchString: 'test',
		searchSuggestion: '',
		items: [buildSearchStreamItem()],
		nextPageUrl: 'https://www.youtube.com/search?prettyPrint=false',
		hasNextPage: true,
		...overrides
	}) as SearchApiResponse;

// ---------------------------------------------------------------------------
// Streams / related items
// ---------------------------------------------------------------------------

export const buildKioskItem = (
	overrides: Partial<KioskApiResponseItem> = {}
): KioskApiResponseItem =>
	({
		url: 'https://www.youtube.com/watch?v=video1',
		name: 'Test Video',
		thumbnails: [buildThumbnail({ url: 'https://example.com/v1.jpg' })],
		streamType: 'VIDEO_STREAM',
		uploaderName: 'Test Channel',
		uploaderUrl: 'https://www.youtube.com/channel/UCtest456',
		duration: 120,
		viewCount: 1000,
		textualUploadDate: '2 weeks ago',
		uploadDate: { approximation: true },
		uploaderVerified: true,
		...overrides
	}) as KioskApiResponseItem;
