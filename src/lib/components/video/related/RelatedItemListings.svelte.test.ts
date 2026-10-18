/**
 * Test Suite: RelatedItemListings.svelte
 *
 * Tests for related videos listing component
 */

import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import RelatedItemListings from './RelatedItemListings.svelte';
import relatedVideosFixture from '../../../../tests/fixtures/adapters/relatedVideosAdaptedResponse.json';
import type { RelatedVideoConfig } from '#lib/adapters/related.js';
import logoPlaceholder from '#lib/assets/placeholders/logofallback.svg';

const mockRelatedVideos: RelatedVideoConfig[] = relatedVideosFixture as RelatedVideoConfig[];
const [heartbeat] = mockRelatedVideos;

describe('RelatedItemListings', () => {
	it('renders a card for every video', () => {
		render(RelatedItemListings, { props: { items: mockRelatedVideos } });
		mockRelatedVideos.forEach((v) => expect(screen.getByText(v.title)).toBeInTheDocument());
	});

	it('renders the empty state when there are no videos', () => {
		render(RelatedItemListings, { props: { items: [] } });

		expect(screen.getByText(/No related [Vv]ideos available/)).toBeInTheDocument();
		expect(screen.getByText('📹')).toBeInTheDocument();
		expect(screen.queryAllByRole('link')).toHaveLength(0);
	});

	it('defaults to an empty list when no videos prop is given', () => {
		render(RelatedItemListings);
		expect(screen.getByText(/No related [Vv]ideos available/)).toBeInTheDocument();
	});

	it('renders all thumbnails with alt text and source', () => {
		render(RelatedItemListings, { props: { items: mockRelatedVideos } });

		mockRelatedVideos.forEach((video) => {
			expect(screen.getByAltText(`${video.title} thumbnail`)).toHaveAttribute(
				'src',
				video.thumbnail
			);
		});
	});

	describe('channel avatars', () => {
		it('renders the avatar when provided', () => {
			render(RelatedItemListings, { props: { items: [heartbeat] } });

			expect(
				screen.getByAltText(`${heartbeat.id}-channel-avatar-${heartbeat.channelName}`)
			).toHaveAttribute('src', heartbeat.thumbnail && heartbeat.channelAvatar);
		});

		it('does not render an avatar when channelAvatar is empty', () => {
			render(RelatedItemListings, {
				props: { items: [{ ...heartbeat, channelAvatar: '' }] }
			});

			expect(
				screen.queryByAltText(`${heartbeat.id}-channel-avatar-${heartbeat.channelName}`)
			).not.toBeInTheDocument();
		});

		it('falls back to the logo placeholder when the avatar image fails to load', async () => {
			render(RelatedItemListings, { props: { items: [heartbeat] } });
			const avatar = screen.getByAltText(`${heartbeat.id}-channel-avatar-${heartbeat.channelName}`);

			await fireEvent.error(avatar);

			expect(avatar).toHaveAttribute('src', logoPlaceholder);
		});
	});

	describe('duration badge', () => {
		it.each([
			['under an hour', 1049, '17:29'],
			['over an hour', 36000, '10:00:00']
		])('renders %s durations (%is → %s)', (_label, duration, expected) => {
			render(RelatedItemListings, { props: { items: [{ ...heartbeat, duration }] } });
			expect(screen.getByText(expected)).toBeInTheDocument();
		});

		it('renders no badge for zero duration', () => {
			render(RelatedItemListings, { props: { items: [{ ...heartbeat, duration: 0 }] } });
			expect(screen.queryByText('0:00')).not.toBeInTheDocument();
		});
	});

	describe('stats', () => {
		it('renders locale-formatted view counts', () => {
			render(RelatedItemListings, { props: { items: mockRelatedVideos } });
			expect(screen.getByText('39,000,000 views')).toBeInTheDocument();
			expect(screen.getByText('16,000,000 views')).toBeInTheDocument();
		});

		it('renders the upload date with a separator', () => {
			render(RelatedItemListings, { props: { items: [heartbeat] } });
			expect(screen.getByText('3 years ago')).toBeInTheDocument();
			expect(screen.getByText('•')).toBeInTheDocument();
		});

		it('hides the separator and date when uploadDate is empty', () => {
			render(RelatedItemListings, { props: { items: [{ ...heartbeat, uploadDate: '' }] } });
			expect(screen.queryByText('•')).not.toBeInTheDocument();
			expect(screen.queryByText('3 years ago')).not.toBeInTheDocument();
		});
	});

	describe('navigation', () => {
		it('renders one overlay link per card, pointing at the video route', () => {
			const { container } = render(RelatedItemListings, { props: { items: mockRelatedVideos } });

			const overlayLinks = container.querySelectorAll('a[href^="/video/"]');
			expect(overlayLinks).toHaveLength(mockRelatedVideos.length * 2);
			expect(screen.getByRole('link', { name: heartbeat.title })).toHaveAttribute(
				'href',
				`/video/${heartbeat.id}`
			);
		});

		it('links the channel row to the channel page with tap preloading', () => {
			const { container } = render(RelatedItemListings, { props: { items: [heartbeat] } });

			const channelLink = container.querySelector('a[href^="/channel/"]');
			expect(channelLink).toHaveAttribute('href', `/channel/${heartbeat.channelId}`);
			expect(channelLink).toHaveAttribute('data-sveltekit-preload-data', 'tap');
		});

		it('keeps channel links above the card overlay link', () => {
			// the channel link must sit on a higher stacking layer than the
			// full-card overlay so it remains clickable
			const { container } = render(RelatedItemListings, { props: { items: [heartbeat] } });
			expect(container.querySelector('a[href^="/channel/"]')).toHaveClass('z-20');
		});
	});

	describe('accessibility', () => {
		it('gives overlay links accessible names via aria-label', () => {
			render(RelatedItemListings, { props: { items: [heartbeat] } });
			expect(screen.getByRole('link', { name: heartbeat.title })).toHaveAttribute(
				'aria-label',
				heartbeat.title
			);
		});

		it('stretches overlay links across the whole card', () => {
			const { container } = render(RelatedItemListings, { props: { items: mockRelatedVideos } });
			container.querySelectorAll('a[href^="/video/"]').forEach((link) => {
				expect(link).toHaveClass('absolute', 'inset-0');
			});
		});
	});
});
