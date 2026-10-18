import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ChannelDetails from './ChannelDetails.svelte';
import channelDetailsFixture from '../../../tests/fixtures/adapters/channelDetailsAdaptedResponse.json';
import type { ChannelConfig } from '#lib/adapters/channel.js';
import avatarFallback from '#lib/assets/placeholders/logofallback.svg?raw';

// Mock asset imports
vi.mock('#lib/assets/logo-placeholder.svg', () => ({
	default: '/placeholder-avatar.svg'
}));

// The fixture already matches ChannelConfig — cast directly
const glitchChannel = channelDetailsFixture as ChannelConfig;

// Short description variant — stays under the 180 char truncation threshold
const shortDescChannel: ChannelConfig = {
	...glitchChannel,
	description: 'A short description.'
};

// No optional fields — banner, handle, description all absent, videoCount 0
const bareChannel: ChannelConfig = {
	...glitchChannel,
	bannerUrl: null,
	avatarUrl: '',
	handle: '',
	description: null,
	videoCount: 0,
	verified: false
};

// Long description variant — exceeds MAX_DESC_LENGTH (180 chars) to trigger truncation
const LONG_DESCRIPTION =
	"Here you'll find fun, colourful animated shows with occasional violence and existential breakdowns. " +
	'We make original content and have been doing so for many years across multiple beloved series.';
const longDescChannel: ChannelConfig = {
	...glitchChannel,
	description: LONG_DESCRIPTION
};

describe('ChannelDetails', () => {
	describe('Banner', () => {
		it('should render banner image when bannerUrl is present', () => {
			render(ChannelDetails, { props: { channel: glitchChannel } });

			const banner = screen.getByAltText('Channel banner');
			expect(banner).toBeTruthy();
			expect(banner.getAttribute('src')).toBe('https://yt.googleusercontent.com/lg/banner.jpg');
		});

		it('should render fallback gradient div when bannerUrl is absent', () => {
			const { container } = render(ChannelDetails, { props: { channel: bareChannel } });

			const banner = container.querySelector('img[alt="Channel banner"]');
			expect(banner).toBeNull();

			const fallback = container.querySelector('.bg-linear-to-r');
			expect(fallback).toBeTruthy();
		});
	});

	describe('Avatar', () => {
		it('should render avatar with correct src and alt', () => {
			render(ChannelDetails, { props: { channel: glitchChannel } });

			const avatar = screen.getByAltText('GLITCH avatar');
			expect(avatar).toBeTruthy();
			expect(avatar.getAttribute('src')).toBe('https://yt.googleusercontent.com/lg/avatar.jpg');
		});

		it('should fall back to placeholder when avatarUrl is empty', () => {
			render(ChannelDetails, { props: { channel: bareChannel } });

			const avatar = screen.getByAltText(`${bareChannel.name} avatar`);
			expect(avatar.getAttribute('src')).toBe(avatarFallback);
		});

		it('falls back to the logo placeholder when the avatar fails to load', async () => {
			render(ChannelDetails, { props: { channel: glitchChannel } });
			const avatar = screen.getByAltText(`${glitchChannel.name} avatar`); // adjust to actual alt
			await fireEvent.error(avatar);
			expect(avatar).toHaveAttribute('src', avatarFallback);
		});
	});

	describe('Channel info', () => {
		it('should render channel name', () => {
			render(ChannelDetails, { props: { channel: glitchChannel } });

			const heading = screen.getByRole('heading', { level: 1 });
			expect(heading.textContent).toContain('GLITCH');
		});

		it('should render verified SVG badge for verified channel', () => {
			render(ChannelDetails, { props: { channel: glitchChannel } });

			const badge = screen.getByLabelText('Verified channel');
			expect(badge).toBeTruthy();
		});

		it('should not render verified badge for unverified channel', () => {
			render(ChannelDetails, { props: { channel: bareChannel } });

			const badge = screen.queryByLabelText('Verified channel');
			expect(badge).toBeNull();
		});

		it('should render handle when present', () => {
			render(ChannelDetails, { props: { channel: glitchChannel } });

			expect(screen.getByText('@GLITCH')).toBeTruthy();
		});

		it('should not render handle when absent', () => {
			render(ChannelDetails, { props: { channel: bareChannel } });

			const handle = screen.queryByText(/@/);
			expect(handle).toBeNull();
		});

		it('should render subscriber count', () => {
			render(ChannelDetails, { props: { channel: glitchChannel } });

			expect(screen.getByText('20,600,000 subscribers')).toBeTruthy();
		});

		it('should render video count with locale formatting when videoCount is greater than zero', () => {
			const withVideos: ChannelConfig = { ...glitchChannel, videoCount: 1500 };
			render(ChannelDetails, { props: { channel: withVideos } });

			expect(screen.getByText('1,500 videos')).toBeTruthy();
		});

		it('should render "No videos available" when video count is 0', () => {
			render(ChannelDetails, { props: { channel: glitchChannel } });

			expect(screen.getByText('No videos available'));
		});
	});

	describe('Description', () => {
		it('should render short description in full without a toggle button', () => {
			render(ChannelDetails, { props: { channel: shortDescChannel } });

			expect(screen.getByText('A short description.')).toBeTruthy();
			expect(screen.queryByRole('button', { name: /more|less/i })).toBeNull();
		});

		it('should truncate long description and show "...more" button', () => {
			render(ChannelDetails, { props: { channel: longDescChannel } });

			const truncated = screen.getByText(LONG_DESCRIPTION.slice(0, 180) + '...', { exact: false });
			expect(truncated).toBeTruthy();
			expect(screen.getByRole('button', { name: '...more' })).toBeTruthy();
		});

		it('should expand full description when "...more" is clicked', async () => {
			render(ChannelDetails, { props: { channel: longDescChannel } });

			await fireEvent.click(screen.getByRole('button', { name: '...more' }));

			expect(screen.getByText(LONG_DESCRIPTION, { exact: false })).toBeTruthy();
			expect(screen.getByRole('button', { name: 'Show less' })).toBeTruthy();
		});

		it('should collapse description again when "Show less" is clicked', async () => {
			render(ChannelDetails, { props: { channel: longDescChannel } });

			await fireEvent.click(screen.getByRole('button', { name: '...more' }));
			await fireEvent.click(screen.getByRole('button', { name: 'Show less' }));

			expect(
				screen.getByText(LONG_DESCRIPTION.slice(0, 180) + '...', { exact: false })
			).toBeTruthy();
			expect(screen.getByRole('button', { name: '...more' })).toBeTruthy();
		});

		it('should not render description section when description is null', () => {
			const { container } = render(ChannelDetails, { props: { channel: bareChannel } });

			// The description wrapper div is only rendered inside {#if channel.description}
			const descWrapper = container.querySelector('.leading-relaxed');
			expect(descWrapper).toBeNull();
		});
	});

	describe('Tab bar', () => {
		it('should render all tabs', () => {
			render(ChannelDetails, { props: { channel: glitchChannel } });

			expect(screen.getByRole('tab', { name: 'Videos' })).toBeTruthy();
			expect(screen.getByRole('tab', { name: 'Playlists' })).toBeTruthy();
		});

		it('should mark Videos as selected by default', () => {
			render(ChannelDetails, { props: { channel: glitchChannel } });

			const homeTab = screen.getByRole('tab', { name: 'Videos' });
			expect(homeTab.getAttribute('aria-selected')).toBe('true');

			const videosTab = screen.getByRole('tab', { name: 'Playlists' });
			expect(videosTab.getAttribute('aria-selected')).toBe('false');
		});

		it('should switch active tab when a tab is clicked', async () => {
			render(ChannelDetails, { props: { channel: glitchChannel } });

			await fireEvent.click(screen.getByRole('tab', { name: 'Videos' }));

			expect(screen.getByRole('tab', { name: 'Videos' }).getAttribute('aria-selected')).toBe(
				'true'
			);
			expect(screen.getByRole('tab', { name: 'Playlists' }).getAttribute('aria-selected')).toBe(
				'false'
			);
		});

		it('should mark the provided activeTab as selected on initial render', () => {
			render(ChannelDetails, { props: { channel: glitchChannel, activeTab: 'playlists' } });

			expect(screen.getByRole('tab', { name: 'Playlists' }).getAttribute('aria-selected')).toBe(
				'true'
			);
			expect(screen.getByRole('tab', { name: 'Videos' }).getAttribute('aria-selected')).toBe(
				'false'
			);
		});

		it('should render tablist with accessible aria-label', () => {
			render(ChannelDetails, { props: { channel: glitchChannel } });

			expect(screen.getByRole('tablist', { name: 'Channel sections' })).toBeTruthy();
		});
	});

	describe('Tab content', () => {
		it('should show videos placeholder when Videos tab is active and no snippet provided', async () => {
			render(ChannelDetails, { props: { channel: glitchChannel } });

			await fireEvent.click(screen.getByRole('tab', { name: 'Videos' }));

			expect(screen.getByText('No videos available')).toBeTruthy();
		});

		it('should show playlists placeholder when Playlists tab is active and no snippet provided', async () => {
			render(ChannelDetails, { props: { channel: glitchChannel } });

			await fireEvent.click(screen.getByRole('tab', { name: 'Playlists' }));

			expect(screen.getByText('No playlists available')).toBeTruthy();
		});

		it('should only show content for the active tab', async () => {
			render(ChannelDetails, { props: { channel: glitchChannel } });

			await fireEvent.click(screen.getByRole('tab', { name: 'Playlists' }));

			expect(screen.getByText('No playlists available')).toBeTruthy();
		});
	});
});
