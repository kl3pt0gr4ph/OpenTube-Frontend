import { selectBestImage } from '#lib/utils/mediaUtils.js';
import type { CommentApiResponse, RelatedCommentApiResponseItem } from '#lib/api/comments.js';

/**
 * Comments result configuration for Comments component display
 */
export interface CommentConfig {
	id: string;
	text: string;
	author: string;
	authorAvatar: string;
	authorUrl: string;
	isVerified: boolean;
	isChannelOwner: boolean;
	uploadDate: string;
	likeCount: number;
	likeCountText: string;
	isPinned: boolean;
	isHearted: boolean;
	replyCount: number;
	hasReplies: boolean;
	repliesUrl?: string;
}

/**
 * Adapt raw comment data into a cleaner format for display
 */
export function adaptComment(
	comment: RelatedCommentApiResponseItem,
	defaultAvatar: string
): CommentConfig {
	return {
		id: comment.commentId,
		text: comment.commentText || '',
		author: comment.uploaderName || 'Unknown User',
		authorAvatar: selectBestImage(comment.uploaderAvatars, defaultAvatar),
		authorUrl: comment.uploaderUrl || '',
		isVerified: comment.uploaderVerified || false,
		isChannelOwner: comment.channelOwner || false,
		uploadDate: comment.textualUploadDate || '',
		likeCount: comment.likeCount || 0,
		likeCountText: comment.textualLikeCount || '0',
		isPinned: comment.pinned || false,
		isHearted: comment.heartedByUploader || false,
		replyCount: comment.replyCount || 0,
		hasReplies: (comment.replyCount || 0) > 0,
		repliesUrl: comment.replies?.url
	};
}

/**
 * Adapt an array of comments
 */
export function adaptComments(
	comments: RelatedCommentApiResponseItem[],
	defaultAvatar: string
): CommentConfig[] {
	return comments.map((comment) => adaptComment(comment, defaultAvatar));
}

/**
 * Adapt a full CommentResponse object from the API
 * This is a convenience function that extracts relatedItems and adapts them
 */
export function adaptCommentResponse(
	response: CommentApiResponse | null,
	defaultAvatar: string
): CommentConfig[] {
	if (!response) return [];
	return adaptComments(response.relatedItems || [], defaultAvatar);
}
