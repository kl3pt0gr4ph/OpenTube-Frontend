import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Page from './+page.svelte';
import channelDetailsFixture from '../../../tests/fixtures/adapters/channelDetailsAdaptedResponse.json';
import channelVideosFixture from '../../../tests/fixtures/adapters/channelVideosAdaptedResponse.json';
import { buildChannelPlaylistItem, buildChannelTabResponse } from '../../../tests/fixtures/builder';

vi.mock('#lib/components/channel/ChannelDetails.svelte', async () => ({
	default: (await import('../../../tests/stubs/ChannelDetailsStub.svelte')).default
}));

vi.mock('#lib/components/channel/ChannelVideos.svelte', () => ({
	default: vi.fn(() => null)
}));

vi.mock('#lib/components/channel/ChannelPlaylists.svelte', () => ({
	default: vi.fn(() => null)
}));

vi.mock('#lib/components/ErrorCard.svelte', () => ({
	default: vi.fn(() => null)
}));

vi.mock('#lib/api/channel.ts', () => ({
	getChannelTab: vi.fn(),
	getChannelTabNextPage: vi.fn()
}));

import { getChannelTab } from '#lib/api/channel.ts';
import { ApiError } from '#lib/api/errors.ts';
import type { ErrorConfig } from '#lib/adapters/error.ts';
import ChannelVideos from '#lib/components/channel/ChannelVideos.svelte';
import ChannelPlaylists from '#lib/components/channel/ChannelPlaylists.svelte';
import ErrorCard from '#lib/components/ErrorCard.svelte';
import type { ChannelConfig, ChannelVideoPage } from '#lib/adapters/channel.ts';
import type { ChannelPageData } from './+page';

const mockChannel = channelDetailsFixture as ChannelConfig;
const videoPage = channelVideosFixture as ChannelVideoPage;
const mockVideos = videoPage.items;

const errorChannel: ChannelConfig = {
	id: '',
	name: '',
	handle: '',
	avatarUrl: null,
	bannerUrl: null,
	description: null,
	subscriberCount: '0',
	videoCount: 0,
	verified: false
};

const privateChannel: ErrorConfig = {
	errorCode: 'CONTENT_PRIVATE',
	variant: 'info',
	title: 'Private channel',
	message: 'This channel is private.',
	retryable: false
};

const createPageData = (overrides: Partial<ChannelPageData> = {}): ChannelPageData => ({
	channel: mockChannel,
	tabs: ['videos', 'playlists'],
	videos: mockVideos,
	nextPage: videoPage.nextPage,
	error: undefined,
	...overrides
});

const reloadMock = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal('location', { ...window.location, reload: reloadMock });
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('+page.svelte - Channel', () => {
	it('should render the normal channel composition when the channel loads successfully', () => {
		const { container } = render(Page, { props: { data: createPageData() } });

		expect(container.querySelector('.w-full.bg-primary.min-h-screen')).toBeTruthy();
		expect(screen.getByTestId('channel-details-stub')).toBeTruthy();
		expect(container.querySelector('.flex.min-h-screen.items-center')).toBeNull();
		expect(vi.mocked(ErrorCard)).not.toHaveBeenCalled();
	});

	it('should pass the adapted videos through the videos snippet to ChannelVideos', () => {
		render(Page, { props: { data: createPageData() } });

		expect(vi.mocked(ChannelVideos)).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ videos: mockVideos })
		);
	});

	it('should fetch a tab the first time it is opened and render its items', async () => {
		vi.mocked(getChannelTab).mockResolvedValue(
			buildChannelTabResponse({ tab: 'playlists', items: [buildChannelPlaylistItem()] })
		);
		render(Page, { props: { data: createPageData() } });

		expect(getChannelTab).not.toHaveBeenCalled();

		await fireEvent.click(screen.getByRole('button', { name: 'playlists' }));

		await waitFor(() =>
			expect(vi.mocked(ChannelPlaylists)).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					tab: 'playlists',
					playlists: [expect.objectContaining({ id: 'PLtest123', title: 'Test Playlist' })]
				})
			)
		);
		expect(getChannelTab).toHaveBeenCalledWith(mockChannel.id, 'playlists');
	});

	it('should show the error and a retry button when a tab fails to load', async () => {
		vi.mocked(getChannelTab).mockRejectedValue(
			new ApiError({ status: 503, errorCode: 'UPSTREAM_BLOCKED', message: 'Blocked.' })
		);
		render(Page, { props: { data: createPageData() } });

		await fireEvent.click(screen.getByRole('button', { name: 'playlists' }));

		expect(
			await screen.findByText(
				'YouTube is rate-limiting requests from this server. Try again in a few minutes.'
			)
		).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
		expect(vi.mocked(ChannelPlaylists)).not.toHaveBeenCalled();
	});

	it('should render the full-page error card when error is set', () => {
		const data = createPageData({ channel: errorChannel, error: privateChannel });

		const { container } = render(Page, { props: { data } });

		expect(
			container.querySelector('.flex.min-h-screen.items-center.justify-center.px-4')
		).toBeTruthy();
		expect(screen.queryByTestId('channel-details-stub')).toBeNull();
		expect(vi.mocked(ErrorCard)).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				message: 'This channel is private.',
				title: 'Private channel',
				variant: 'info',
				showRetry: false,
				onRetry: expect.any(Function)
			})
		);
	});

	it('should reload the page when the ErrorCard retry callback is invoked', () => {
		const data = createPageData({ channel: errorChannel, error: privateChannel });
		render(Page, { props: { data } });

		const errorCardProps = vi.mocked(ErrorCard).mock.calls[0][1] as { onRetry: () => void };
		errorCardProps.onRetry();

		expect(reloadMock).toHaveBeenCalledTimes(1);
	});

	it.each([
		['data is entirely empty', {}, []],
		['data.channel is undefined', { videos: mockVideos, error: undefined }, mockVideos],
		['data.videos is undefined', { channel: mockChannel, error: undefined }, []]
	])(
		'should render the normal branch via $derived defaults when %s',
		(_label, data, expectedVideos) => {
			expect(() => render(Page, { props: { data: data as ChannelPageData } })).not.toThrow();
			expect(screen.getByTestId('channel-details-stub')).toBeTruthy();
			expect(vi.mocked(ChannelVideos)).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ videos: expectedVideos })
			);
		}
	);
});
