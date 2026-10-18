/**
 * Test Suite: comments adapter
 *
 * Tests for comment data adaptation and transformation
 */

import { describe, it, expect } from 'vitest';
import { adaptComment, adaptComments, adaptCommentResponse } from './comments';
import { buildCommentItem, buildCommentResponse, buildImage } from '../../tests/fixtures/builder';
import commentsResponse from '../../tests/fixtures/api/commentsResponse.json';
import commentsResultFixture from '../../tests/fixtures/adapters/commentsResult.json';
import type { CommentApiResponse, RelatedCommentApiResponseItem } from '#lib/api/comments.js';

const defaultAvatar = 'https://example.com/default-avatar.jpg';

describe('adaptComment', () => {
	it('adapts a complete comment with all fields mapped', () => {
		expect(adaptComment(buildCommentItem(), defaultAvatar)).toEqual({
			id: 'comment-test-id',
			text: 'A test comment',
			author: '@TestUser',
			authorAvatar: 'https://yt3.ggpht.com/test-avatar.jpg',
			authorUrl: 'https://www.youtube.com/channel/UCtest456',
			isVerified: false,
			isChannelOwner: false,
			uploadDate: '2 years ago',
			likeCount: 100,
			likeCountText: '100',
			isPinned: false,
			isHearted: false,
			replyCount: 0,
			hasReplies: false,
			repliesUrl: undefined
		});
	});

	it('selects the index-2 avatar when several are available', () => {
		const result = adaptComment(
			buildCommentItem({
				uploaderAvatars: [
					buildImage({ url: 'a0.jpg', height: 48, width: 48, estimatedResolutionLevel: 'LOW' }),
					buildImage({ url: 'a1.jpg', height: 88, width: 88, estimatedResolutionLevel: 'MEDIUM' }),
					buildImage({ url: 'a2.jpg', height: 176, width: 176, estimatedResolutionLevel: 'HIGH' })
				]
			}),
			defaultAvatar
		);
		expect(result.authorAvatar).toBe('a2.jpg');
	});

	describe('fallbacks', () => {
		it.each([
			['missing text', { commentText: undefined }, 'text', ''],
			['empty author', { uploaderName: '' }, 'author', 'Unknown User'],
			['empty author url', { uploaderUrl: '' }, 'authorUrl', ''],
			['missing like count', { likeCount: undefined }, 'likeCount', 0],
			['empty like count text', { textualLikeCount: '' }, 'likeCountText', '0'],
			['missing reply count', { replyCount: undefined }, 'replyCount', 0],
			['empty avatars', { uploaderAvatars: [] }, 'authorAvatar', defaultAvatar],
			['empty upload date', { textualUploadDate: '' }, 'uploadDate', '']
		])('%s', (_label, override, field, expected) => {
			const result = adaptComment(buildCommentItem(override as never), defaultAvatar);
			expect(result[field as keyof typeof result]).toBe(expected);
		});

		it('defaults all boolean flags to false when missing', () => {
			const result = adaptComment(
				buildCommentItem({
					uploaderVerified: undefined,
					channelOwner: undefined,
					pinned: undefined,
					heartedByUploader: undefined
				} as never),
				defaultAvatar
			);
			expect(result.isVerified).toBe(false);
			expect(result.isChannelOwner).toBe(false);
			expect(result.isPinned).toBe(false);
			expect(result.isHearted).toBe(false);
		});
	});

	it('derives hasReplies and repliesUrl from reply data', () => {
		const withReplies = adaptComment(
			buildCommentItem({
				replyCount: 914,
				replies: { url: 'https://www.youtube.com/watch?v=video1', id: 'reply-id' }
			} as never),
			defaultAvatar
		);
		expect(withReplies.hasReplies).toBe(true);
		expect(withReplies.replyCount).toBe(914);
		expect(withReplies.repliesUrl).toBe('https://www.youtube.com/watch?v=video1');
	});
});

describe('adaptComments', () => {
	it('adapts all comments and preserves order', () => {
		const result = adaptComments(
			[buildCommentItem({ commentId: 'first' }), buildCommentItem({ commentId: 'second' })],
			defaultAvatar
		);
		expect(result.map((c) => c.id)).toEqual(['first', 'second']);
	});

	it('returns [] for an empty array', () => {
		expect(adaptComments([], defaultAvatar)).toEqual([]);
	});

	it('matches the commentsResult round-trip fixture on real-shaped data', () => {
		const items = (commentsResponse[0] as CommentApiResponse)
			.relatedItems as RelatedCommentApiResponseItem[];
		expect(adaptComments(items, defaultAvatar)).toEqual(commentsResultFixture);
	});
});

describe('adaptCommentResponse', () => {
	it.each([
		['null response', null],
		['missing relatedItems', buildCommentResponse({ relatedItems: undefined })]
	])('returns [] for %s', (_label, input) => {
		expect(adaptCommentResponse(input as never, defaultAvatar)).toEqual([]);
	});

	it('adapts relatedItems from a full response', () => {
		const response = buildCommentResponse({
			relatedItems: [buildCommentItem({ commentId: 'from-response' })]
		});
		const result = adaptCommentResponse(response, defaultAvatar);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('from-response');
	});
});
