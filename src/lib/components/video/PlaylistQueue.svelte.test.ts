/**
 * Test Suite: PlaylistQueue.svelte
 *
 * Tests for playlist queue sidebar component including header rendering,
 * active item highlighting, navigation links, and scroll-into-view behaviour
 */

import { render, screen, waitFor } from '@testing-library/svelte';
import { type Mock, describe, it, expect, vi, beforeEach } from 'vitest';
import PlaylistQueue from './PlaylistQueue.svelte';

import type { RelatedVideoConfig } from '#lib/adapters/related.js';

const mockQueueVideos: RelatedVideoConfig[] = [
	{
		type: 'video',
		id: 'video-one-id',
		url: 'https://www.youtube.com/watch?v=video-one-id',
		title: 'First Queue Video',
		thumbnail: 'https://example.com/thumb-one.jpg',
		channelName: 'Channel One',
		channelId: 'UCchannel1',
		channelAvatar: 'https://example.com/avatar-one.jpg',
		duration: 120, // 2:00
		viewCount: 1000,
		uploadDate: '1 week ago'
	},
	{
		type: 'video',
		id: 'video-two-id',
		url: 'https://www.youtube.com/watch?v=video-two-id',
		title: 'Second Queue Video',
		thumbnail: 'https://example.com/thumb-two.jpg',
		channelName: 'Channel Two',
		channelId: 'UCchannel2',
		channelAvatar: 'https://example.com/avatar-two.jpg',
		duration: 65, // 1:05
		viewCount: 5000,
		uploadDate: '2 weeks ago'
	},
	{
		type: 'video',
		id: 'video-three-id',
		url: 'https://www.youtube.com/watch?v=video-three-id',
		title: 'Third Queue Video',
		thumbnail: 'https://example.com/thumb-three.jpg',
		channelName: 'Channel Three',
		channelId: 'UCchannel3',
		channelAvatar: 'https://example.com/avatar-three.jpg',
		duration: 3661, // 1:01:01
		viewCount: 250,
		uploadDate: '1 month ago'
	},
	{
		type: 'video',
		id: 'video-four-id',
		url: 'https://www.youtube.com/watch?v=video-four-id',
		title: 'Fourth Queue Video',
		thumbnail: 'https://example.com/thumb-four.jpg',
		channelName: 'Channel Four',
		channelId: 'UCchannel4',
		channelAvatar: 'https://example.com/avatar-four.jpg',
		duration: 0, // Live / unknown duration
		viewCount: 0,
		uploadDate: '2 months ago'
	}
];

const defaultProps = {
	videos: mockQueueVideos,
	playlistId: 'PLtest123',
	currentIndex: 0,
	playlistName: 'Test Playlist'
};

let scrollIntoViewMock: Mock<(arg?: boolean | ScrollIntoViewOptions) => void>;

beforeEach(() => {
	vi.clearAllMocks();

	scrollIntoViewMock = vi.fn<(arg?: boolean | ScrollIntoViewOptions) => void>();
	Element.prototype.scrollIntoView = scrollIntoViewMock;
});

describe('PlaylistQueue', () => {
	it('renders every queue video as a link', () => {
		render(PlaylistQueue, { props: defaultProps });

		mockQueueVideos.forEach((v) => expect(screen.getByText(v.title)).toBeInTheDocument());
		expect(screen.getAllByRole('link')).toHaveLength(mockQueueVideos.length);
		expect(screen.getByText('Channel One')).toBeInTheDocument();
	});

	describe('header', () => {
		it('renders the playlist name', () => {
			render(PlaylistQueue, { props: defaultProps });
			expect(screen.getByText('Test Playlist')).toBeInTheDocument();
		});

		it('falls back to the default playlist name when not provided', () => {
			render(PlaylistQueue, {
				props: { videos: mockQueueVideos, playlistId: 'PLtest123', currentIndex: 0 }
			});
			expect(screen.getByText('Playlist')).toBeInTheDocument();
		});

		it.each([
			[0, mockQueueVideos, '1 / 4'],
			[2, mockQueueVideos, '3 / 4'],
			[0, [mockQueueVideos[0]], '1 / 1']
		])(
			'shows a 1-indexed counter: index %i of %j videos → %s',
			(currentIndex, videos, expected) => {
				render(PlaylistQueue, { props: { ...defaultProps, videos, currentIndex } });
				expect(screen.getByText(expected)).toBeInTheDocument();
			}
		);
	});

	describe('active item', () => {
		it('marks exactly the current video with aria-current', () => {
			const { container } = render(PlaylistQueue, {
				props: { ...defaultProps, currentIndex: 1 }
			});

			expect(screen.getByText('Second Queue Video').closest('a')).toHaveAttribute(
				'aria-current',
				'true'
			);
			expect(container.querySelectorAll('[aria-current="true"]')).toHaveLength(1);
			expect(screen.getByText('First Queue Video').closest('a')).not.toHaveAttribute(
				'aria-current'
			);
		});

		it('shows index numbers for inactive items and playing bars for the active one', () => {
			render(PlaylistQueue, { props: { ...defaultProps, currentIndex: 1 } });

			const firstLink = screen.getByText('First Queue Video').closest('a');
			expect(firstLink?.textContent).toContain('1');
			const activeLink = screen.getByText('Second Queue Video').closest('a');
			expect(activeLink?.textContent).not.toContain('2');
		});
	});

	describe('navigation links', () => {
		it('links each item to the video with playlist and index params', () => {
			render(PlaylistQueue, { props: defaultProps });

			expect(screen.getByText('First Queue Video').closest('a')).toHaveAttribute(
				'href',
				'/video/video-one-id?playlist=PLtest123&index=0'
			);
			expect(screen.getByText('Third Queue Video').closest('a')).toHaveAttribute(
				'href',
				'/video/video-three-id?playlist=PLtest123&index=2'
			);
		});

		it('URL-encodes the video ID', () => {
			render(PlaylistQueue, {
				props: { ...defaultProps, videos: [{ ...mockQueueVideos[0], id: 'id with spaces&chars' }] }
			});

			const href = screen.getByText('First Queue Video').closest('a')?.getAttribute('href');
			expect(href).toContain(encodeURIComponent('id with spaces&chars'));
			expect(href).not.toContain('id with spaces');
		});

		it('URL-encodes the playlist ID', () => {
			render(PlaylistQueue, { props: { ...defaultProps, playlistId: 'PL test&id' } });

			expect(screen.getByText('First Queue Video').closest('a')?.getAttribute('href')).toContain(
				`playlist=${encodeURIComponent('PL test&id')}`
			);
		});
	});

	it('renders all thumbnails with alt text and source', () => {
		render(PlaylistQueue, { props: defaultProps });

		mockQueueVideos.forEach((video) => {
			const thumbnail = screen.getByAltText(`Thumbnail for ${video.title}`);
			expect(thumbnail).toHaveAttribute('src', video.thumbnail);
		});
	});

	describe('duration badge', () => {
		it('renders formatted durations from the shared formatter', () => {
			render(PlaylistQueue, { props: defaultProps });
			expect(screen.getByText('2:00')).toBeInTheDocument();
			expect(screen.getByText('1:01:01')).toBeInTheDocument();
		});

		it('renders no badge for zero duration', () => {
			render(PlaylistQueue, { props: defaultProps });
			expect(screen.queryByText('0:00')).not.toBeInTheDocument();
		});
	});

	describe('scroll behaviour', () => {
		it('scrolls the active item into view exactly once on mount', async () => {
			render(PlaylistQueue, { props: { ...defaultProps, currentIndex: 2 } });

			await waitFor(() => {
				expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
				expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: 'nearest' });
			});
		});

		it('does not scroll when no item is active', async () => {
			render(PlaylistQueue, { props: { ...defaultProps, currentIndex: 99 } });

			// give the tick().then() microtask a chance to run
			await Promise.resolve();
			await Promise.resolve();

			expect(scrollIntoViewMock).not.toHaveBeenCalled();
		});

		it('scrolls the newly active item into view when currentIndex changes', async () => {
			const { rerender } = render(PlaylistQueue, {
				props: { ...defaultProps, currentIndex: 0 }
			});
			await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalledTimes(1));

			await rerender({ currentIndex: 2 });

			await waitFor(() => {
				expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);
				expect(screen.getByText('Third Queue Video').closest('a')).toHaveAttribute(
					'aria-current',
					'true'
				);
				expect(screen.getByText('First Queue Video').closest('a')).not.toHaveAttribute(
					'aria-current'
				);
			});
		});
	});

	describe('edge cases', () => {
		it('renders the header with an empty video list', () => {
			render(PlaylistQueue, { props: { ...defaultProps, videos: [] } });

			expect(screen.getByText('Test Playlist')).toBeInTheDocument();
			expect(screen.getByText('1 / 0')).toBeInTheDocument();
			expect(screen.queryAllByRole('link')).toHaveLength(0);
		});

		it('marks nothing active when currentIndex is out of range', () => {
			const { container } = render(PlaylistQueue, {
				props: { ...defaultProps, currentIndex: 99 }
			});

			expect(container.querySelectorAll('[aria-current="true"]')).toHaveLength(0);
			expect(screen.getByText('100 / 4')).toBeInTheDocument();
		});
	});

	it('hides the decorative header icon from screen readers', () => {
		const { container } = render(PlaylistQueue, { props: defaultProps });
		expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
	});
});
