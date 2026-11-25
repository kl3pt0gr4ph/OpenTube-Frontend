import { PUBLIC_API_URL } from '$app/env/public';
import type { Image, Replies, UploadDate } from '#lib/api/types.ts';
import { apiFetchJson } from '#lib/api/client.ts';

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
export function getVideoComments(
	id: string,
	fetchFn?: typeof globalThis.fetch
): Promise<CommentApiResponse | null> {
	return apiFetchJson(`${API_BASE_URL}/comments?id=${encodeURIComponent(id)}`, fetchFn);
}
