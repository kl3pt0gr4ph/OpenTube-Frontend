import { extractIdFromUrl } from '#lib/utils/streamSelection.js';
import { selectBestImage } from '#lib/utils/mediaUtils.js';
import { formatCount } from '#lib/utils/formatters.js';
import type {
	ChannelInfoApiResponse,
	ChannelVideoApiResponseItem,
	ChannelVideosApiResponse
} from '#lib/api/channel.js';
import type { NextPage } from '#lib/api/types.js';

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
	id: string;
	title: string;
	thumbnail: string;
	uploaderName: string;
	uploaderUrl: string | null;
	uploadedDate: string;
	duration: number;
	viewCount: number;
	isShort: boolean;
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
 * Adapt a single raw ChannelVideoItem into a ChannelVideoConfig.
 */
function adaptChannelVideo(
	video: ChannelVideoApiResponseItem,
	thumbnailFallback: string,
	avatarFallback: string
): ChannelVideoConfig {
	return {
		id: extractIdFromUrl(video.url),
		title: video.name || 'Untitled',
		thumbnail: video.thumbnails?.[video.thumbnails.length - 1]?.url ?? thumbnailFallback,
		uploaderName: video.uploaderName || 'Unknown',
		uploaderUrl: video.uploaderUrl || avatarFallback,
		uploadedDate: video.textualUploadDate || '',
		duration: Math.max(0, video.duration ?? 0),
		viewCount: Math.max(0, video.viewCount ?? 0),
		isShort: video.isShortFormContent ?? false
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
		nextPage: response.nextPage?.url || response.nextPage?.body ? response.nextPage : null
	};
}
