import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import PlaylistResult from './PlaylistResult.svelte';
import searchResultFixture from '../../../tests/fixtures/adapters/searchAdaptedResponse.json';
import thumbnailFallback from '#lib/assets/placeholders/thumbnailFallback.svg';

// Mock asset imports
vi.mock('#lib/assets/thumbnail-placeholder.jpg', () => ({
	default: '/placeholder-thumbnail.jpg'
}));

// Mock SvelteKit navigation
const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => mockGoto(...args)
}));

// Mock the playlist API fetcher — redirectToPlaylist fetches the playlist
// to resolve the first video before navigating
vi.mock('#lib/api/playlist.js');
import { getPlaylist } from '#lib/api/playlist.js';
import type { PlaylistSearchResultConfig } from '#lib/adapters/search.js';
const mockGetPlaylist = vi.mocked(getPlaylist);

const playlistFixture = searchResultFixture.items[3] as PlaylistSearchResultConfig;

// Derived variant with no thumbnail — triggers placeholder fallback
const noThumbnailResult: PlaylistSearchResultConfig = {
	...playlistFixture,
	thumbnail: ''
};

// Derived variant with zero video count
const zeroVideosResult: PlaylistSearchResultConfig = {
	...playlistFixture,
	videoCount: 0
};

const mockPlaylistResponse = {
	relatedItems: [
		{ url: 'https://www.youtube.com/watch?v=first-video-id' },
		{ url: 'https://www.youtube.com/watch?v=second-video-id' }
	]
};

// Navigation resolves the first video in the playlist, then carries the
// playlist context in the query string
const expectedVideoUrl = `/video/first-video-id?playlist=${encodeURIComponent(playlistFixture.id)}&index=0`;

// Setup and Teardown
beforeEach(() => {
	vi.clearAllMocks();
	mockGetPlaylist.mockResolvedValue(mockPlaylistResponse as never);
});

// Tests
describe('PlaylistResult', () => {
	describe('Rendering with real data', () => {
		it('should render the playlist title in both layouts', () => {
			render(PlaylistResult, { props: { result: playlistFixture } });

			const titles = screen.getAllByText('Murder Drones');
			// One in desktop layout, one in mobile layout
			expect(titles.length).toBeGreaterThanOrEqual(2);
		});

		it('should render the thumbnail with correct src and alt in both layouts', () => {
			render(PlaylistResult, { props: { result: playlistFixture } });

			const thumbnails = screen.getAllByAltText('Thumbnail for Murder Drones');
			expect(thumbnails).toHaveLength(2);
			thumbnails.forEach((thumbnail) => {
				expect(thumbnail.getAttribute('src')).toBe(
					'https://i.ytimg.com/vi/md-playlist-id/hq720.jpg'
				);
			});
		});

		it('should render the video count badge in both layouts', () => {
			render(PlaylistResult, { props: { result: playlistFixture } });

			const badges = screen.getAllByText('8 videos');
			expect(badges).toHaveLength(2);
		});

		it('should render the "Playlist" label in both layouts', () => {
			render(PlaylistResult, { props: { result: playlistFixture } });

			const labels = screen.getAllByText('Playlist');
			expect(labels).toHaveLength(2);
		});

		it('should render the uploader name in both layouts', () => {
			render(PlaylistResult, { props: { result: playlistFixture } });

			const uploaderNames = screen.getAllByText('GLITCH');
			expect(uploaderNames.length).toBeGreaterThanOrEqual(2);
		});

		it('should render the uploader as a link with the correct href in the desktop layout', () => {
			const { container } = render(PlaylistResult, { props: { result: playlistFixture } });

			const uploaderLink = container.querySelector(
				'a[href="https://www.youtube.com/channel/glitch-channel-id"]'
			);
			expect(uploaderLink).toBeTruthy();
			expect(uploaderLink?.textContent?.trim()).toBe('GLITCH');
		});
	});

	describe('Thumbnail fallback', () => {
		it('should use placeholder thumbnail when thumbnail is empty', () => {
			render(PlaylistResult, { props: { result: noThumbnailResult } });

			const thumbnails = screen.getAllByAltText('Thumbnail for Murder Drones');
			expect(thumbnails).toHaveLength(2);
			thumbnails.forEach((thumbnail) => {
				expect(thumbnail.getAttribute('src')).toBe(thumbnailFallback);
			});
		});
	});

	describe('Edge cases', () => {
		it('should render zero video count correctly', () => {
			render(PlaylistResult, { props: { result: zeroVideosResult } });

			const badges = screen.getAllByText('0 videos');
			expect(badges).toHaveLength(2);
		});

		it('should render a playlist with a long title without crashing', () => {
			const longTitleResult: PlaylistSearchResultConfig = {
				...playlistFixture,
				title: 'A'.repeat(200)
			};
			render(PlaylistResult, { props: { result: longTitleResult } });

			const titles = screen.getAllByText('A'.repeat(200));
			expect(titles.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe('Navigation', () => {
		it('should fetch the playlist and navigate to its first video when the desktop thumbnail button is clicked', async () => {
			const { container } = render(PlaylistResult, { props: { result: playlistFixture } });

			const buttons = container.querySelectorAll('[role="button"]');
			await fireEvent.click(buttons[0]);

			await waitFor(() => {
				expect(mockGoto).toHaveBeenCalledWith(expectedVideoUrl);
			});
			expect(mockGetPlaylist).toHaveBeenCalledWith(playlistFixture.id);
		});

		it('should navigate when the desktop title button is clicked', async () => {
			const { container } = render(PlaylistResult, { props: { result: playlistFixture } });

			const buttons = container.querySelectorAll('[role="button"]');
			await fireEvent.click(buttons[1]);

			await waitFor(() => {
				expect(mockGoto).toHaveBeenCalledWith(expectedVideoUrl);
			});
		});

		it('should navigate when the mobile layout button is clicked', async () => {
			const { container } = render(PlaylistResult, { props: { result: playlistFixture } });

			// Mobile layout is the third role="button" (index 2)
			const buttons = container.querySelectorAll('[role="button"]');
			await fireEvent.click(buttons[2]);

			await waitFor(() => {
				expect(mockGoto).toHaveBeenCalledWith(expectedVideoUrl);
			});
		});

		it('should navigate when Enter is pressed on a button', async () => {
			const { container } = render(PlaylistResult, { props: { result: playlistFixture } });

			const buttons = container.querySelectorAll('[role="button"]');
			await fireEvent.keyDown(buttons[0], { key: 'Enter' });

			await waitFor(() => {
				expect(mockGoto).toHaveBeenCalledWith(expectedVideoUrl);
			});
		});

		it('should not navigate when a non-Enter key is pressed', async () => {
			const { container } = render(PlaylistResult, { props: { result: playlistFixture } });

			const buttons = container.querySelectorAll('[role="button"]');
			await fireEvent.keyDown(buttons[0], { key: 'Space' });

			expect(mockGetPlaylist).not.toHaveBeenCalled();
			expect(mockGoto).not.toHaveBeenCalled();
		});

		it('should not navigate when the uploader link is clicked', async () => {
			const { container } = render(PlaylistResult, { props: { result: playlistFixture } });

			const uploaderLink = container.querySelector('a');
			await fireEvent.click(uploaderLink!);

			expect(mockGetPlaylist).not.toHaveBeenCalled();
			expect(mockGoto).not.toHaveBeenCalled();
		});

		it.each([
			[
				'the playlist has no videos',
				() => mockGetPlaylist.mockResolvedValue({ relatedItems: [] } as never)
			],
			[
				'the first video URL has no video ID',
				() =>
					mockGetPlaylist.mockResolvedValue({
						relatedItems: [{ url: 'https://www.youtube.com/watch' }]
					} as never)
			],
			[
				'the playlist fetch fails',
				() => mockGetPlaylist.mockRejectedValue(new Error('Failed to fetch playlist'))
			]
		])('does not navigate when %s', async (_label, arrange) => {
			arrange();
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const { container } = render(PlaylistResult, { props: { result: playlistFixture } });

			await fireEvent.click(container.querySelectorAll('[role="button"]')[0]);

			await waitFor(() => {
				expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load playlist:', expect.any(Error));
			});
			expect(mockGoto).not.toHaveBeenCalled();
		});

		it('should ignore clicks while a playlist fetch is in flight', async () => {
			let resolveFetch!: (value: unknown) => void;
			mockGetPlaylist.mockImplementation(
				() =>
					new Promise((resolve) => {
						resolveFetch = resolve;
					}) as never
			);
			const { container } = render(PlaylistResult, { props: { result: playlistFixture } });

			const buttons = container.querySelectorAll('[role="button"]');
			await fireEvent.click(buttons[0]);
			await fireEvent.click(buttons[0]);

			// The loading guard should have swallowed the second click
			expect(mockGetPlaylist).toHaveBeenCalledTimes(1);

			resolveFetch(mockPlaylistResponse);

			await waitFor(() => {
				expect(mockGoto).toHaveBeenCalledTimes(1);
			});
		});
	});
});
