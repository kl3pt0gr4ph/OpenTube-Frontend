import { extractIdFromUrl } from '#lib/utils/streamSelection.js';
import { selectBestImage } from '#lib/utils/mediaUtils.js';
import type { KioskApiResponseItem } from '#lib/api/kiosk.js';

export interface KioskVideoConfig {
	id: string;
	url: string;
	title: string;
	thumbnail: string;
	channelAvatar: string;
	channelId: string;
	channelName: string;
	viewCount: number;
	uploadDate: string;
	duration: number;
}

/**
 * Adapts a single kiosk item ot kiosk video config
 */
function adaptKioskVideo(
	item: KioskApiResponseItem,
	defaultThumbnail: string,
	defaultAvatar: string
): KioskVideoConfig {
	return {
		id: extractIdFromUrl(item.url),
		url: item.url || '',
		title: item.name || 'Untitled Video',
		thumbnail: selectBestImage(item.thumbnails, defaultThumbnail),
		channelAvatar: selectBestImage(item.uploaderAvatars, defaultAvatar),
		channelId: extractIdFromUrl(item.uploaderUrl),
		channelName: item.uploaderName || 'Unknown Channel',
		viewCount: handleNegativeCount(item.viewCount) || 0,
		duration: handleNegativeCount(item.duration) || 0,
		uploadDate: item.textualUploadDate || ''
	};
}

/**
 * Adapts an array of kiosk items into related video configurations
 */
export function adaptKioskVideos(
	items: KioskApiResponseItem[] | undefined,
	defaultThumbnail: string,
	defaultAvatar: string
): KioskVideoConfig[] {
	if (!items || items.length === 0) {
		return [];
	}

	return items
		.filter((item: KioskApiResponseItem): string => item && item.url && item.name)
		.map((item: KioskApiResponseItem): KioskVideoConfig =>
			adaptKioskVideo(item, defaultThumbnail, defaultAvatar)
		);
}

function handleNegativeCount(count: number): number {
	return count < 0 ? 0 : count;
}
