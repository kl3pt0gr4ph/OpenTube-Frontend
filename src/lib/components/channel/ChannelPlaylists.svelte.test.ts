import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ChannelPlaylists from './ChannelPlaylists.svelte';
import type { ChannelPlaylistConfig } from '#lib/adapters/channel.js';

const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => mockGoto(...args)
}));

vi.mock('#lib/api/playlist.js');
import { getPlaylist } from '#lib/api/playlist.js';

const playlist: ChannelPlaylistConfig = {
	type: 'playlist',
	id: 'PLtest123',
	title: 'Test Playlist',
	thumbnail: 'https://example.com/playlist.jpg',
	streamCount: 8,
	uploaderId: 'UCtest456',
	uploaderName: 'Test Channel'
};

describe('ChannelPlaylists', () => {
	it('should render a card for every playlist', () => {
		const playlists = [playlist, { ...playlist, id: 'PLother', title: 'Other Playlist' }];

		render(ChannelPlaylists, { props: { playlists } });

		expect(screen.getByText('Test Playlist')).toBeTruthy();
		expect(screen.getByText('Other Playlist')).toBeTruthy();
		expect(screen.getAllByText('8 videos')).toHaveLength(2);
	});

	it('should count tracks, not videos, on the albums tab', () => {
		render(ChannelPlaylists, { props: { playlists: [playlist], tab: 'albums' } });

		expect(screen.getByText('8 tracks')).toBeTruthy();
		expect(screen.getByText('Album')).toBeTruthy();
	});

	it('should open a playlist at its first video when its card is clicked', async () => {
		vi.mocked(getPlaylist).mockResolvedValue({
			relatedItems: [{ url: 'https://www.youtube.com/watch?v=first-video-id' }]
		} as never);
		render(ChannelPlaylists, { props: { playlists: [playlist] } });

		await fireEvent.click(screen.getByRole('button', { name: 'Play playlist Test Playlist' }));

		await waitFor(() =>
			expect(mockGoto).toHaveBeenCalledWith('/video/first-video-id?playlist=PLtest123&index=0')
		);
		expect(getPlaylist).toHaveBeenCalledWith('PLtest123');
	});

	it.each(['playlists', 'albums'] as const)(
		'should show an empty state, not an error, for an empty %s tab',
		(tab) => {
			render(ChannelPlaylists, { props: { playlists: [], tab } });

			expect(screen.getByText(`No ${tab} available`)).toBeTruthy();
		}
	);
});
