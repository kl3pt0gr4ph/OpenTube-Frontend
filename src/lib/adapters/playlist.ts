import { extractIdFromUrl } from '#lib/utils/streamSelection.js';
import { selectBestImage } from '#lib/utils/mediaUtils.js';
import logoPlaceholder from '#lib/assets/placeholders/logofallback.svg?raw';
import bannerPlaceholder from '#lib/assets/placeholders/bannerFallback.svg?raw';
import thumbnailPlaceholder from '#lib/assets/placeholders/thumbnailFallback.svg?raw';
import type { RelatedItemApiResponse } from '#lib/api/related.js';
import type { PlaylistApiResponse } from '#lib/api/playlist.js';
import type { RelatedVideoConfig } from '#lib/adapters/related.js';

export interface PlaylistInfoConfig {
	id: string;
	name: string;
	url: string;
	uploaderName: string;
	uploaderId: string;
	uploaderUrl: string | null;
	uploaderAvatarUrl: string | null;
	bannerUrl?: string | null;
	thumbnailUrl: string | null;
	description?: string | null;
}

export function adaptPlaylistInfo(info: PlaylistApiResponse): PlaylistInfoConfig {
	return {
		id: info.id,
		name: info.name,
		url: info.url,
		uploaderName: info.uploaderName,
		uploaderId: extractIdFromUrl(info.uploaderUrl),
		uploaderAvatarUrl: selectBestImage(info.uploaderAvatars, logoPlaceholder),
		bannerUrl: selectBestImage(info.banners, bannerPlaceholder),
		thumbnailUrl: selectBestImage(info.thumbnails, thumbnailPlaceholder),
		uploaderUrl: info.uploaderUrl,
		description: info.description?.content || null
	};
}

function adaptPlaylistVideo(video: RelatedItemApiResponse): RelatedVideoConfig {
	return {
		type: 'video',
		id: extractIdFromUrl(video.url),
		url: video.url,
		title: video.name || 'Untitled',
		thumbnail: selectBestImage(video.thumbnails, thumbnailPlaceholder),
		channelName: video.uploaderName || 'Unknown',
		channelId: extractIdFromUrl(video.uploaderUrl),
		channelAvatar: selectBestImage(video.uploaderAvatars, logoPlaceholder),
		duration: Math.max(0, video.duration ?? 0),
		viewCount: Math.max(0, video.viewCount ?? 0),
		uploadDate: video.textualUploadDate
	};
}

export function adaptPlaylistVideos(response: PlaylistApiResponse): RelatedVideoConfig[] {
	if (!response?.relatedItems) return [];
	return response.relatedItems.map(adaptPlaylistVideo);
}
