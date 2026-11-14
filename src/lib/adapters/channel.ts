import { extractIdFromUrl } from '#lib/utils/streamSelection.js';
import { selectBestImage } from '#lib/utils/mediaUtils.js';
import { formatCount } from '#lib/utils/formatters.js';
import type {
	ChannelInfoApiResponse,
	ChannelPlaylistApiResponseItem,
	ChannelTabApiResponse,
	ChannelTabApiResponseItem,
	ChannelTabChannelApiResponseItem,
	ChannelVideoApiResponseItem,
	ChannelVideosApiResponse
} from '#lib/api/channel.js';
import { CHANNEL_TABS, type ChannelTabName, type NextPage } from '#lib/api/types.js';
import type { RelatedPlaylistConfig } from '#lib/adapters/related.js';

/**
 * Format a raw subscriber count into a compact display string.
 * e.g. 16_800_000 → "16.8M", 430_000 → "430K", 980 → "980"
 */
export function formatSubscriberCount(count: number): string {
	if (count < 0) return '0';
	if (count >= 1_000_000) {
		const val: number = count / 1_000_000;
		return `${parseFloat(val.toFixed(1))}M`;
	}
	if (count >= 1_000) {
		const val: number = count / 1_000;
		return `${parseFloat(val.toFixed(1))}K`;
	}
	return count.toString();
}

export interface ChannelVideoPage {
	items: ChannelVideoConfig[];
	nextPage: NextPage | null;
}

export interface ChannelConfig {
	id: string;
	name: string;
	handle: string;
	avatarUrl: string | null;
	bannerUrl: string | null;
	description: string | null;
	subscriberCount: string;
	videoCount: number;
	verified: boolean;
}

export interface ChannelVideoConfig {
	type: 'video';
	id: string;
	title: string;
	thumbnail: string;
	uploaderName: string;
	uploaderUrl: string | null;
	uploadedDate: string;
	duration: number;
	viewCount: number;
	isShort: boolean;
	isLive: boolean;
}

export type ChannelPlaylistConfig = RelatedPlaylistConfig;

export interface ChannelTabChannelConfig {
	type: 'channel';
	id: string;
	name: string;
	avatar: string;
	subscriberCount: number;
	verified: boolean;
}

export type ChannelTabItemConfig =
	ChannelVideoConfig | ChannelPlaylistConfig | ChannelTabChannelConfig;

export interface ChannelTabPage {
	items: ChannelTabItemConfig[];
	nextPage: NextPage | null;
}

/**
 * Adapt raw channel info from the API into a display-ready ChannelConfig.
 */
export function adaptChannelInfo(
	info: ChannelInfoApiResponse,
	videoCount: number = 0
): ChannelConfig {
	return {
		id: info.id,
		name: info.name || 'Unknown Channel',
		handle: info.handle ? `@${info.handle.replace(/^@/, '')}` : `@${info.id}`,
		avatarUrl: selectBestImage(info.avatars, info.avatarUrl),
		bannerUrl: selectBestImage(info.banners, info.bannerUrl),
		description: info.description,
		subscriberCount: formatCount(info.subscriberCount ?? 0),
		videoCount,
		verified: info.verified ?? false
	};
}

/**
 * List the tabs a channel has that the frontend can render, in display order.
 * Falls back to the videos tab when the channel reports none.
 */
export function adaptChannelTabs(
	tabs: ChannelInfoApiResponse['tabs'] | undefined
): ChannelTabName[] {
	const available = new Set<string>(
		(tabs ?? []).flatMap((tab): string[] =>
			(tab?.contentFilters ?? []).map((filter: string): string => filter.toLowerCase())
		)
	);
	const supported: ChannelTabName[] = CHANNEL_TABS.filter((tab: ChannelTabName): boolean =>
		available.has(tab)
	);
	return supported.length > 0 ? supported : ['videos'];
}

/**
 * Adapt a single raw ChannelVideoItem into a ChannelVideoConfig.
 */
function adaptChannelVideo(
	video: ChannelVideoApiResponseItem,
	thumbnailFallback: string,
	avatarFallback: string,
	isLive: boolean = false
): ChannelVideoConfig {
	return {
		type: 'video',
		id: extractIdFromUrl(video.url),
		title: video.name || 'Untitled',
		thumbnail: video.thumbnails?.[video.thumbnails.length - 1]?.url ?? thumbnailFallback,
		uploaderName: video.uploaderName || 'Unknown',
		uploaderUrl: video.uploaderUrl || avatarFallback,
		uploadedDate: video.textualUploadDate || '',
		duration: Math.max(0, video.duration ?? 0),
		viewCount: Math.max(0, video.viewCount ?? 0),
		isShort: video.isShortFormContent ?? false,
		isLive
	};
}

function adaptChannelPlaylist(
	playlist: ChannelPlaylistApiResponseItem,
	thumbnailFallback: string
): ChannelPlaylistConfig {
	return {
		type: 'playlist',
		id: extractIdFromUrl(playlist.url),
		title: playlist.name || 'Untitled',
		thumbnail: selectBestImage(playlist.thumbnails, thumbnailFallback),
		streamCount: Math.max(0, playlist.streamCount ?? 0),
		uploaderId: extractIdFromUrl(playlist.uploaderUrl ?? ''),
		uploaderName: playlist.uploaderName ?? ''
	};
}

function adaptChannelTabChannel(
	channel: ChannelTabChannelApiResponseItem,
	avatarFallback: string
): ChannelTabChannelConfig {
	return {
		type: 'channel',
		id: extractIdFromUrl(channel.url),
		name: channel.name || 'Unknown Channel',
		avatar: selectBestImage(channel.thumbnails, avatarFallback),
		subscriberCount: Math.max(0, channel.subscriberCount ?? 0),
		verified: channel.verified ?? false
	};
}

/**
 * Adapt one channel tab item, dispatching on its `infoType`.
 * Returns null for a type the frontend doesn't know or an item without an id.
 */
function adaptChannelTabItem(
	item: ChannelTabApiResponseItem,
	thumbnailFallback: string,
	avatarFallback: string,
	isLivestreamsTab: boolean
): ChannelTabItemConfig | null {
	if (!extractIdFromUrl(item?.url)) return null;

	switch (item.infoType) {
		case 'STREAM':
			// The API doesn't say whether a stream is live. On the livestreams tab,
			// finished streams have a duration; live and upcoming ones don't.
			return adaptChannelVideo(
				item,
				thumbnailFallback,
				avatarFallback,
				isLivestreamsTab && (item.duration ?? 0) <= 0
			);
		case 'PLAYLIST':
			return adaptChannelPlaylist(item, thumbnailFallback);
		case 'CHANNEL':
			return adaptChannelTabChannel(item, avatarFallback);
		default:
			return null;
	}
}

function adaptNextPage(nextPage: NextPage | null | undefined): NextPage | null {
	return nextPage?.url || nextPage?.body ? nextPage : null;
}

/**
 * Adapt one page of any channel tab (videos, shorts, livestreams, playlists, albums).
 */
export function adaptChannelTab(
	response: ChannelTabApiResponse | null,
	thumbnailFallback: string,
	avatarFallback: string
): ChannelTabPage {
	if (!response?.items) return { items: [], nextPage: null };

	const isLivestreamsTab: boolean = response.tab === 'livestreams';

	return {
		items: response.items
			.map((item: ChannelTabApiResponseItem): ChannelTabItemConfig | null =>
				adaptChannelTabItem(item, thumbnailFallback, avatarFallback, isLivestreamsTab)
			)
			.filter((item: ChannelTabItemConfig | null): item is ChannelTabItemConfig => item !== null),
		nextPage: adaptNextPage(response.nextPage)
	};
}

/**
 * Adapt a full ChannelVideosResponse into an array of ChannelVideoConfig.
 */
export function adaptChannelVideos(
	response: ChannelVideosApiResponse | null,
	thumbnailFallback: string,
	avatarFallback: string
): ChannelVideoPage {
	if (!response?.items) return { items: [], nextPage: null };

	return {
		items: response.items.map((v: ChannelVideoApiResponseItem): ChannelVideoConfig =>
			adaptChannelVideo(v, thumbnailFallback, avatarFallback)
		),
		nextPage: adaptNextPage(response.nextPage)
	};
}
