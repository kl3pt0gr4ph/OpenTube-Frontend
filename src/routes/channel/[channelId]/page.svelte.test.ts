import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';
import channelDetailsFixture from '../../../tests/fixtures/adapters/channelDetailsAdaptedResponse.json';
import channelVideosFixture from '../../../tests/fixtures/adapters/channelVideosAdaptedResponse.json';

vi.mock('#lib/components/channel/ChannelDetails.svelte', async () => ({
	default: (await import('../../../tests/stubs/ChannelDetailsStub.svelte')).default
}));

vi.mock('#lib/components/channel/ChannelVideos.svelte', () => ({
	default: vi.fn(() => null)
}));

vi.mock('#lib/components/ErrorCard.svelte', () => ({
	default: vi.fn(() => null)
}));

import ChannelVideos from '#lib/components/channel/ChannelVideos.svelte';
import ErrorCard from '#lib/components/ErrorCard.svelte';
import type { ChannelConfig, ChannelVideoPage } from '#lib/adapters/channel.js';
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

const createPageData = (overrides: Partial<ChannelPageData> = {}): ChannelPageData => ({
	channel: mockChannel,
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

	it('should render the playlists snippet placeholder', () => {
		render(Page, { props: { data: createPageData() } });

		expect(screen.getByText('Playlists coming soon')).toBeTruthy();
	});

	it('should render the full-page error composition when error is set and channel name is empty', () => {
		const data = createPageData({ channel: errorChannel, error: 'Channel not found' });

		const { container } = render(Page, { props: { data } });

		expect(
			container.querySelector('.flex.min-h-screen.items-center.justify-center.px-4')
		).toBeTruthy();
		expect(screen.queryByTestId('channel-details-stub')).toBeNull();
		expect(vi.mocked(ErrorCard)).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				message: 'Channel not found',
				title: 'Failed to Load Channel',
				variant: 'error',
				showRetry: true,
				onRetry: expect.any(Function)
			})
		);
	});

	it('should reload the page when the ErrorCard retry callback is invoked', () => {
		const data = createPageData({ channel: errorChannel, error: 'Channel not found' });
		render(Page, { props: { data } });

		// Pull onRetry off the props the page passed to ErrorCard and
		// invoke it, exercising the () => window.location.reload() closure
		const errorCardProps = vi.mocked(ErrorCard).mock.calls[0][1] as { onRetry: () => void };
		errorCardProps.onRetry();

		expect(reloadMock).toHaveBeenCalledTimes(1);
	});

	it('should fall through to the normal branch when error is set but channel name is populated', () => {
		// Error && !channel.name is false when channel.name is truthy,
		// so a partial error (e.g. videos unavailable) still renders the channel
		const data = createPageData({ error: 'Videos unavailable' });

		const { container } = render(Page, { props: { data } });

		expect(screen.getByTestId('channel-details-stub')).toBeTruthy();
		expect(container.querySelector('.flex.min-h-screen.items-center')).toBeNull();
		expect(vi.mocked(ErrorCard)).not.toHaveBeenCalled();
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
