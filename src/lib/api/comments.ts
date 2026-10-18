import { PUBLIC_API_URL } from '$app/env/public';
import type { Image, Replies, UploadDate } from '#lib/api/types.js';

const API_BASE_URL = PUBLIC_API_URL;

/**
 * API response for comments
 */
export interface CommentApiResponse {
	serviceId: number;
	id: string;
	url: string;
	originalUrl?: string;
	name: string;
	errors?: unknown[];
	relatedItems: RelatedCommentApiResponseItem[];
}

export interface RelatedCommentApiResponseItem {
	infoType: string;
	serviceId: number;
	url: string;
	name: string;
	thumbnails: Image[];
	commentId: string;
	commentText: string;
	uploaderName: string;
	uploaderAvatars: Image[];
	uploaderUrl: string;
	uploaderVerified: boolean;
	textualUploadDate: string;
	uploadDate: UploadDate;
	likeCount: number;
	textualLikeCount: string;
	heartedByUploader: boolean;
	pinned: boolean;
	streamPosition: number;
	replyCount: number;
	replies: Replies;
	channelOwner: boolean;
}

/**
 * Fetch comments for a given video ID
 */
export async function getVideoComments(
	id: string,
	fetchFn?: typeof globalThis.fetch
): Promise<CommentApiResponse | null> {
	const fetcher = fetchFn ?? globalThis.fetch;

	try {
		const res = await fetcher(`${API_BASE_URL}/comments?id=${encodeURIComponent(id)}`);

		if (!res.ok) {
			throw new Error(`Failed to fetch comments for ${id}: ${res.status} ${res.statusText}`);
		}

		const data = await res.json();

		return data;
	} catch (error) {
		console.error('Error fetching video comments:', error);
		throw error;
	}
}
