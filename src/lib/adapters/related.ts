import { extractIdFromUrl } from '#lib/utils/streamSelection.js';
import { selectBestImage } from '#lib/utils/mediaUtils.js';

import type { RelatedItemApiResponse } from '#lib/api/related.js';

/**
 * Related video configuration for listings display
 */
export interface RelatedVideoConfig {
	type: 'video';
	id: string;
	url: string;
	title: string;
	thumbnail: string;
	channelName: string;
	channelId: string;
	channelAvatar: string | null;
	viewCount: number;
	uploadDate: string;
	duration: number;
}

export interface RelatedPlaylistConfig {
	type: 'playlist';
	id: string;
	title: string;
	thumbnail: string;
	streamCount: number;
	uploaderId: string;
	uploaderName: string;
}

export interface RelatedChannelConfig {
	type: 'channel';
	id: string;
	name: string;
	avatar: string;
	subscriberCount: number;
	verified: boolean;
}

export type RelatedItemConfig = RelatedVideoConfig | RelatedPlaylistConfig | RelatedChannelConfig;

function adaptVideo(
	video: RelatedItemApiResponse,
	defaultThumbnail: string,
	defaultAvatar: string
): RelatedVideoConfig | null {
	const id: string = extractIdFromUrl(video.url);
	if (!id) return null;
	return {
		type: 'video',
		id,
		url: video.url,
		title: video.name,
		thumbnail: selectBestImage(video.thumbnails, defaultThumbnail),
		duration: handleNegativeCount(video.duration) || 0,
		viewCount: handleNegativeCount(video.viewCount) || 0,
		uploadDate: video.textualUploadDate ?? '',
		channelId: extractIdFromUrl(video.uploaderUrl),
		channelName: video.uploaderName ?? 'Unknown Channel',
		channelAvatar: selectBestImage(video.uploaderAvatars, defaultAvatar)
	};
}

function adaptPlaylist(
	playlist: RelatedItemApiResponse,
	defaultThumbnail: string
): RelatedPlaylistConfig | null {
	const id: string = extractIdFromUrl(playlist.url);
	if (!id) return null;
	return {
		type: 'playlist',
		id,
		title: playlist.name,
		thumbnail: selectBestImage(playlist.thumbnails, defaultThumbnail),
		streamCount: handleNegativeCount(playlist.streamCount) || 0,
		uploaderId: extractIdFromUrl(playlist.uploaderUrl),
		uploaderName: playlist.uploaderName ?? ''
	};
}

function adaptChannel(
	channel: RelatedItemApiResponse,
	defaultAvatar: string
): RelatedChannelConfig | null {
	const id: string = extractIdFromUrl(channel.url);
	if (!id) return null;
	return {
		type: 'channel',
		id,
		name: channel.name,
		avatar: selectBestImage(channel.thumbnails, defaultAvatar),
		subscriberCount: handleNegativeCount(channel.subscriberCount),
		verified: channel.verified ?? false
	};
}

export function adaptRelatedItem(
	item: RelatedItemApiResponse,
	defaultThumbnail: string,
	defaultAvatar: string
): RelatedItemConfig | null {
	switch (item.infoType) {
		case 'STREAM':
			return adaptVideo(item, defaultThumbnail, defaultAvatar);
		case 'PLAYLIST':
			return adaptPlaylist(item, defaultThumbnail);
		case 'CHANNEL':
			return adaptChannel(item, defaultAvatar);
		default:
			return null;
	}
}

/**
 * Adapts an array of related items into related video configurations
 * Filters out invalid items (missing required fields) and transforms remaining items
 */
export function adaptRelatedItems(
	items: RelatedItemApiResponse[] | null,
	defaultThumbnail: string,
	defaultAvatar: string
): RelatedItemConfig[] {
	if (!items) return [];

	return items
		.filter((item: RelatedItemApiResponse): item is RelatedItemApiResponse =>
			Boolean(item?.url && item?.name)
		)
		.map((item: RelatedItemApiResponse): RelatedItemConfig | null =>
			adaptRelatedItem(item, defaultThumbnail, defaultAvatar)
		)
		.filter((item: RelatedItemConfig | null): item is RelatedItemConfig => item !== null);
}

function handleNegativeCount(count: number): number {
	return count < 0 ? 0 : count;
}
