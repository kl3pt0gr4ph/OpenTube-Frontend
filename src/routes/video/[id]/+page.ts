import type { PageLoad } from './$types';
import { getVideoDetails } from '#lib/api/details.js';
import { getRelatedStreams } from '#lib/api/related.js';
import { adaptPlayerConfig, type VideoPlayerConfig } from '#lib/adapters/player.js';
import { adaptVideoMetadata, type VideoMetadata } from '#lib/adapters/metadata.js';
import {
	adaptRelatedItems,
	type RelatedItemConfig,
	type RelatedVideoConfig
} from '#lib/adapters/related.js';
import {
	adaptPlaylistInfo,
	adaptPlaylistVideos,
	type PlaylistInfoConfig
} from '#lib/adapters/playlist.js';
import thumbnailPlaceholder from '#lib/assets/placeholders/thumbnailFallback.svg';
import logoPlaceholder from '#lib/assets/placeholders/logofallback.svg';
import { getManifest } from '#lib/api/manifest.js';
import { getVideoThumbnails } from '#lib/api/thumbnails.js';
import { getPlaylist } from '#lib/api/playlist.js';
import { getVideoComments } from '#lib/api/comments.js';
import { adaptCommentResponse, type CommentConfig } from '#lib/adapters/comments.js';

interface ErrorPageData {
	videoId: string;
	playerConfig: { manifestUrl: string; duration: number; poster: string };
	metadata: {
		title: string;
		description: string;
		channelName: string;
		channelAvatar: null;
		viewCount: number;
		uploadDate: string;
		likeCount: number;
		dislikeCount: number;
		subscriberCount: number;
	};
	relatedItems: RelatedItemConfig[];
	error: string;
}

/**
 * Creates error page data with default values
 */
function createErrorPageData(error: unknown, videoId: string): ErrorPageData {
	const errorMessage: string =
		error instanceof Error ? error.message : 'Unknown error loading video';

	return <ErrorPageData>{
		videoId,
		playerConfig: {
			manifestUrl: '',
			duration: 0,
			poster: thumbnailPlaceholder
		},
		metadata: {
			title: 'Error Loading Video',
			description: 'Failed to load video information',
			channelName: 'Unknown',
			channelAvatar: null,
			viewCount: 0,
			uploadDate: '',
			likeCount: 0,
			dislikeCount: 0,
			subscriberCount: 0
		},
		relatedItems: [],
		error: errorMessage
	};
}

export interface VideoPageData {
	playerConfig: VideoPlayerConfig;
	metadata: VideoMetadata;
	relatedItems: RelatedItemConfig[];
	comments?: CommentConfig[];
	playlistId?: string | null;
	playlistIndex?: number | null;
	playlistVideos?: RelatedVideoConfig[] | null;
	playlistInfo?: PlaylistInfoConfig | null;
	videoId?: string | null;
	error?: string;
}

/**
 * Page load function - fetches and transforms data
 */
export const load: PageLoad = async ({ params, url, fetch }): Promise<VideoPageData> => {
	try {
		const playlistId: string | null = url.searchParams.get('playlist') ?? null;
		const playlistIndex: number | null = playlistId
			? parseInt(url.searchParams.get('index') ?? '0', 10)
			: null;

		const [thumbnails, details, manifest, relatedStreams, comments, playlistResponse] =
			await Promise.all([
				getVideoThumbnails(params.id, fetch),
				getVideoDetails(params.id, fetch),
				getManifest(params.id, fetch),
				getRelatedStreams(params.id, fetch).catch((e) => {
					console.warn('Failed to fetch related items:', e);
					return [];
				}),
				getVideoComments(params.id, fetch).catch((e) => {
					console.warn('Failed to fetch comments:', e);
					return null;
				}),
				playlistId
					? getPlaylist(playlistId, fetch).catch((e) => {
							console.warn('Failed to fetch playlist:', e);
							return null;
						})
					: Promise.resolve(null)
			]);

		const playerConfig: VideoPlayerConfig = {
			...adaptPlayerConfig(manifest.url, manifest.duration, thumbnails.url),
			isMuxed: manifest.isMuxed ?? false
		};

		const metadata: VideoMetadata = adaptVideoMetadata(details, thumbnails.url);
		const relatedItems: RelatedItemConfig[] = adaptRelatedItems(
			relatedStreams,
			thumbnailPlaceholder,
			logoPlaceholder
		);
		const adaptedComments: CommentConfig[] = comments
			? adaptCommentResponse(comments, logoPlaceholder)
			: [];

		const playlistVideos: RelatedVideoConfig[] | null = playlistResponse
			? adaptPlaylistVideos(playlistResponse)
			: null;

		const playlistInfo: PlaylistInfoConfig | null = playlistResponse
			? adaptPlaylistInfo(playlistResponse)
			: null;

		return {
			videoId: params.id,
			playerConfig,
			metadata,
			relatedItems,
			comments: adaptedComments,
			playlistId,
			playlistIndex,
			playlistVideos,
			playlistInfo
		};
	} catch (error) {
		console.error('Error loading video data:', error);
		return createErrorPageData(error, params.id);
	}
};
