import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom';
import Comments from './Comments.svelte';
import type { CommentConfig } from '#lib/adapters/comments.js';
import avatarFallback from '#lib/assets/placeholders/logofallback.svg';

vi.mock('#lib/assets/logo-placeholder.svg', () => ({ default: '/logo-placeholder.svg' }));

const baseComment: CommentConfig = {
	id: 'comment-123',
	text: 'This is a great video!',
	author: '@TestUser',
	authorAvatar: 'https://yt3.ggpht.com/test-avatar.jpg',
	authorUrl: 'https://www.youtube.com/channel/test-channel',
	isVerified: false,
	isChannelOwner: false,
	uploadDate: '2 days ago',
	likeCount: 42,
	likeCountText: '42',
	isPinned: false,
	isHearted: false,
	replyCount: 0,
	hasReplies: false,
	repliesUrl: 'https://www.youtube.com/watch?v=test-id'
};

const pinnedChannelOwnerComment: CommentConfig = {
	...baseComment,
	id: 'pinned-comment',
	author: '@ChannelOwner',
	isVerified: true,
	isChannelOwner: true,
	isPinned: true,
	isHearted: true,
	likeCount: 64000,
	likeCountText: '64k',
	replyCount: 914,
	hasReplies: true,
	uploadDate: '4 years ago'
};

const commentWithReplies: CommentConfig = {
	...baseComment,
	id: 'reply-comment',
	replyCount: 5,
	hasReplies: true
};

describe('Comments.svelte', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('Basic rendering', () => {
		it('should render the author name', () => {
			const { getByText } = render(Comments, { comment: baseComment });
			expect(getByText('@TestUser')).toBeInTheDocument();
		});

		it('should render the comment text', () => {
			const { getByText } = render(Comments, { comment: baseComment });
			expect(getByText('This is a great video!')).toBeInTheDocument();
		});

		it('should render the upload date', () => {
			const { getByText } = render(Comments, { comment: baseComment });
			expect(getByText('2 days ago')).toBeInTheDocument();
		});

		it('should render the like count', () => {
			const { getByText } = render(Comments, { comment: baseComment });
			expect(getByText('42')).toBeInTheDocument();
		});

		it('should render avatar with correct src and alt', () => {
			const { getByAltText } = render(Comments, { comment: baseComment });
			const avatar = getByAltText('@TestUser-avatar');
			expect(avatar).toHaveAttribute('src', baseComment.authorAvatar);
		});

		it('should render author link with correct href', () => {
			const { getAllByRole } = render(Comments, { comment: baseComment });
			const links = getAllByRole('link');
			const authorLinks = links.filter((l) => l.getAttribute('href') === baseComment.authorUrl);
			expect(authorLinks.length).toBeGreaterThan(0);
		});

		it('should render HTML content in comment text', () => {
			const htmlComment = {
				...baseComment,
				text: 'Check this out: <a href="https://example.com">link</a>'
			};
			const { container } = render(Comments, { comment: htmlComment });
			expect(container.querySelector('a[href="https://example.com"]')).toBeInTheDocument();
		});
	});

	describe('Verified badge', () => {
		it('should show verified badge when isVerified is true', () => {
			const { container } = render(Comments, {
				comment: { ...baseComment, isVerified: true }
			});
			expect(container.querySelector('svg[aria-label="Verified"]')).toBeInTheDocument();
		});

		it('should not show verified badge when isVerified is false', () => {
			const { container } = render(Comments, { comment: baseComment });
			expect(container.querySelector('svg[aria-label="Verified"]')).not.toBeInTheDocument();
		});
	});

	describe('Creator badge', () => {
		it('should show Creator badge when isChannelOwner is true', () => {
			const { getByText } = render(Comments, {
				comment: { ...baseComment, isChannelOwner: true }
			});
			expect(getByText('Creator')).toBeInTheDocument();
		});

		it('should not show Creator badge when isChannelOwner is false', () => {
			const { queryByText } = render(Comments, { comment: baseComment });
			expect(queryByText('Creator')).not.toBeInTheDocument();
		});
	});

	describe('Pinned indicator', () => {
		it('should show Pinned label when isPinned is true', () => {
			const { getByText } = render(Comments, {
				comment: { ...baseComment, isPinned: true }
			});
			expect(getByText('Pinned')).toBeInTheDocument();
		});

		it('should not show Pinned label when isPinned is false', () => {
			const { queryByText } = render(Comments, { comment: baseComment });
			expect(queryByText('Pinned')).not.toBeInTheDocument();
		});
	});

	describe('Heart indicator', () => {
		it('should show heart icon when isHearted is true', () => {
			const { container } = render(Comments, {
				comment: { ...baseComment, isHearted: true }
			});
			// The HeartIcon is inside a div with title="Hearted by creator"
			expect(container.querySelector('[title="Hearted by creator"]')).toBeInTheDocument();
		});

		it('should not show heart icon when isHearted is false', () => {
			const { container } = render(Comments, { comment: baseComment });
			expect(container.querySelector('[title="Hearted by creator"]')).not.toBeInTheDocument();
		});
	});

	describe('Pinned channel owner comment', () => {
		it('should render all badges for a pinned channel owner comment', () => {
			const { getByText, container } = render(Comments, { comment: pinnedChannelOwnerComment });
			expect(getByText('Creator')).toBeInTheDocument();
			expect(getByText('Pinned')).toBeInTheDocument();
			expect(container.querySelector('svg[aria-label="Verified"]')).toBeInTheDocument();
			expect(container.querySelector('[title="Hearted by creator"]')).toBeInTheDocument();
		});
	});

	describe('Reply button', () => {
		it('should show reply button when hasReplies is true and depth is 0', () => {
			const { getByText } = render(Comments, { comment: commentWithReplies });
			expect(getByText('5 replies')).toBeInTheDocument();
		});

		it('should not show reply button when hasReplies is false', () => {
			const { queryByText } = render(Comments, { comment: baseComment });
			expect(queryByText(/replies/)).not.toBeInTheDocument();
		});

		it('should not show reply button when depth equals maxDepth (3)', () => {
			const { queryByText } = render(Comments, { comment: commentWithReplies, depth: 3 });
			expect(queryByText(/replies/)).not.toBeInTheDocument();
		});

		it('should use singular "reply" for replyCount of 1', () => {
			const { getByText } = render(Comments, {
				comment: { ...baseComment, hasReplies: true, replyCount: 1 }
			});
			expect(getByText('1 reply')).toBeInTheDocument();
		});

		it('reply button should be enabled initially', () => {
			const { getByText } = render(Comments, { comment: commentWithReplies });
			const button = getByText('5 replies').closest('button');
			expect(button).not.toBeDisabled();
		});
	});

	describe('Toggle replies interaction', () => {
		it('should show Loading... and disable button while loading replies', async () => {
			const { getByText } = render(Comments, { comment: commentWithReplies });

			const replyButton = getByText('5 replies').closest('button')!;
			await fireEvent.click(replyButton);

			expect(getByText('Loading...')).toBeInTheDocument();
			expect(replyButton).toBeDisabled();
		});

		it('should show replies placeholder after loading completes', async () => {
			const { getByText, queryByText } = render(Comments, { comment: commentWithReplies });

			const replyButton = getByText('5 replies').closest('button')!;
			await fireEvent.click(replyButton);

			// Advance the 300ms setTimeout
			vi.advanceTimersByTime(300);

			await waitFor(() => {
				expect(queryByText('Loading...')).not.toBeInTheDocument();
				expect(getByText(/Replies loading/)).toBeInTheDocument();
			});
		});

		it('should hide replies when toggle is clicked again after showing', async () => {
			const { getByText, queryByText } = render(Comments, { comment: commentWithReplies });

			// First click — load and show replies
			const replyButton = getByText('5 replies').closest('button')!;
			await fireEvent.click(replyButton);
			vi.advanceTimersByTime(300);

			await waitFor(() => {
				expect(queryByText('Loading...')).not.toBeInTheDocument();
			});

			// Second click — hide replies (no loading state since hasReplies && !showReplies is false)
			await fireEvent.click(replyButton);

			await waitFor(() => {
				expect(queryByText(/Replies loading/)).not.toBeInTheDocument();
			});
		});
	});

	describe('Avatar fallback', () => {
		it('should fall back to logoPlaceholder when authorAvatar is empty', () => {
			const { getByAltText } = render(Comments, {
				comment: { ...baseComment, authorAvatar: '' }
			});
			const avatar = getByAltText('@TestUser-avatar');
			expect(avatar).toHaveAttribute('src', avatarFallback);
		});

		it('should fall back to logoPlaceholder on avatar load error', async () => {
			const { getByAltText } = render(Comments, { comment: baseComment });
			const avatar = getByAltText('@TestUser-avatar');

			await fireEvent.error(avatar);

			expect(avatar).toHaveAttribute('src', avatarFallback);
		});
	});

	describe('Depth prop', () => {
		it('should default depth to 0', () => {
			const { container } = render(Comments, { comment: baseComment });
			const commentContainer = container.querySelector('.comment-container');
			expect(commentContainer).not.toHaveClass('ml-8');
		});

		it('should apply ml-8 class when depth is 1', () => {
			const { container } = render(Comments, { comment: baseComment, depth: 1 });
			const commentContainer = container.querySelector('.comment-container');
			expect(commentContainer).toHaveClass('ml-8');
		});

		it('should apply ml-12 class when depth is greater than 1', () => {
			const { container } = render(Comments, { comment: baseComment, depth: 2 });
			const commentContainer = container.querySelector('.comment-container');
			expect(commentContainer).toHaveClass('ml-12');
		});
	});
});
