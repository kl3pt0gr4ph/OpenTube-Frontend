/**
 * Test Suite: VideoDetail.svelte
 *
 * Tests for video metadata display component with collapsible description
 */

import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import VideoDetail from './VideoDetail.svelte';
import videoDetailsFixture from '../../../tests/fixtures/adapters/detailsResult.json';
import type { VideoMetadata } from '#lib/adapters/metadata.js';
import avatarFallback from '#lib/assets/placeholders/logofallback.svg';

const mockMetadata: VideoMetadata = videoDetailsFixture[0];
const mockNoAvatarLargeNumbers: VideoMetadata = videoDetailsFixture[1];
const mockLongDescZeroViews: VideoMetadata = videoDetailsFixture[2];

describe('VideoDetail', () => {
	describe('metadata display', () => {
		it('renders title, channel name, and avatar', () => {
			render(VideoDetail, { props: { metadata: mockMetadata } });

			expect(screen.getByText(mockMetadata.title).tagName).toBe('H2');
			expect(screen.getByText(mockMetadata.channelName)).toBeInTheDocument();
			expect(screen.getByAltText(mockMetadata.channelName)).toHaveAttribute(
				'src',
				mockMetadata.channelAvatar
			);
		});

		it('falls back to the logo placeholder when channelAvatar is empty', () => {
			render(VideoDetail, { props: { metadata: mockNoAvatarLargeNumbers } });

			expect(screen.getByAltText(mockNoAvatarLargeNumbers.channelName)).toHaveAttribute(
				'src',
				avatarFallback
			);
		});
	});

	describe('view count', () => {
		it('renders the locale-formatted view count', () => {
			render(VideoDetail, { props: { metadata: mockNoAvatarLargeNumbers } });

			const formatted = new Intl.NumberFormat('en-US').format(
				Math.floor(mockNoAvatarLargeNumbers.viewCount)
			);
			expect(screen.getByText(`${formatted} views`)).toBeInTheDocument();
		});

		it('renders zero views', () => {
			render(VideoDetail, { props: { metadata: mockLongDescZeroViews } });
			expect(screen.getByText('0 views')).toBeInTheDocument();
		});
	});

	describe('description', () => {
		it('renders the description text', () => {
			render(VideoDetail, { props: { metadata: mockMetadata } });
			expect(screen.getByText(mockMetadata.description, { exact: false })).toBeInTheDocument();
		});

		it('renders HTML content in the description', () => {
			const htmlMetadata = {
				...mockMetadata,
				description: 'Check this out: <a href="https://example.com">link</a>'
			};
			const { container } = render(VideoDetail, { props: { metadata: htmlMetadata } });
			expect(container.querySelector('a[href="https://example.com"]')).toBeInTheDocument();
		});

		it('expands and collapses through the full toggle cycle', async () => {
			const user = userEvent.setup();
			const { container } = render(VideoDetail, {
				props: { metadata: mockLongDescZeroViews }
			});
			const gradient = () => container.querySelector('.pointer-events-none');

			// collapsed by default: "Show more" + fade gradient present
			expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument();
			expect(gradient()).toBeInTheDocument();

			// expand
			await user.click(screen.getByRole('button', { name: 'Show more' }));
			expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument();
			expect(gradient()).not.toBeInTheDocument();

			// collapse again
			await user.click(screen.getByRole('button', { name: 'Show less' }));
			expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument();
			expect(gradient()).toBeInTheDocument();
		});

		it('toggle works with an empty description', async () => {
			const user = userEvent.setup();
			render(VideoDetail, { props: { metadata: { ...mockMetadata, description: '' } } });

			await user.click(screen.getByRole('button', { name: 'Show more' }));
			expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument();
		});
	});

	describe('subscribe button', () => {
		it('renders the subscribe button', () => {
			render(VideoDetail, { props: { metadata: mockMetadata } });
			expect(screen.getByRole('button', { name: 'Subscribe' })).toBeInTheDocument();
		});

		it('does not affect the description toggle', async () => {
			const user = userEvent.setup();
			render(VideoDetail, { props: { metadata: mockMetadata } });

			await user.click(screen.getByRole('button', { name: 'Subscribe' }));

			// still collapsed
			expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument();
		});
	});
});
