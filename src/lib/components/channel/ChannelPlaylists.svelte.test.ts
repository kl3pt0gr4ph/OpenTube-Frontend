import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ChannelPlaylists from './ChannelPlaylists.svelte';
import type { ChannelPlaylistConfig } from '#lib/adapters/channel.js';

// The playlist card navigates and fetches when clicked
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('#lib/api/playlist.js');

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

	it.each(['playlists', 'albums'] as const)(
		'should show an empty state, not an error, for an empty %s tab',
		(tab) => {
			render(ChannelPlaylists, { props: { playlists: [], tab } });

			expect(screen.getByText(`No ${tab} available`)).toBeTruthy();
		}
	);
});
