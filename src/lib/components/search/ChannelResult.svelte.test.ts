import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { adaptSearchResults, type ChannelSearchResultConfig } from '#lib/adapters/search.js';
import ChannelResult from './ChannelResult.svelte';
import channelSearchResultFixtures from '../../../tests/fixtures/adapters/channelSearchResult.json';
import avatarPlaceholder from '#lib/assets/placeholders/logofallback.svg';

vi.mock('#lib/assets/logo-placeholder.svg', () => ({
	default: '/placeholder-avatar.svg'
}));

const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => mockGoto(...args)
}));

const [glitchResult, glitchRobloxResult] = adaptSearchResults(
	{ items: channelSearchResultFixtures } as never,
	'default-thumbnail.jpg',
	'default-avatar.jpg'
).items.filter((r): r is ChannelSearchResultConfig => r.type === 'channel');

const bareChannel: ChannelSearchResultConfig = {
	...glitchRobloxResult,
	avatar: '',
	subscriberCount: 0,
	description: null,
	verified: false
};

describe('ChannelResult', () => {
	describe('Rendering with real data', () => {
		it('should render channel name in both layouts', () => {
			render(ChannelResult, { props: { result: glitchResult } });

			const names = screen.getAllByText('GLITCH', { exact: false });
			// One instance in desktop layout, one in mobile layout
			expect(names.length).toBeGreaterThanOrEqual(2);
		});

		it('should render channel avatar with correct src and alt in both layouts', () => {
			render(ChannelResult, { props: { result: glitchResult } });

			const avatars = screen.getAllByAltText('GLITCH');
			expect(avatars).toHaveLength(2);
			avatars.forEach((avatar) => {
				expect(avatar.getAttribute('src')).toBe(
					'https://yt3.ggpht.com/JgzaWBB7n02Ru2TTmcVLCJJNBW1mLnh_f6eJYPOuEShb3PaXmwkqas5zfpA_sVXjYkg_UNmx=s88-c-k-c0x00ffffff-no-rj-mo'
				);
			});
		});

		it('should render formatted subscriber count in both layouts', () => {
			render(ChannelResult, { props: { result: glitchResult } });

			const subCounts = screen.getAllByText('20,600,000 subscribers', { exact: false });
			expect(subCounts).toHaveLength(2);
		});

		it('should render description in desktop layout only when present', () => {
			render(ChannelResult, { props: { result: glitchResult } });

			// Description only renders in the desktop layout — not the mobile layout
			const descriptions = screen.getAllByText(
				"Here you'll find fun, colourful animated shows with occasional violence and existential breakdowns :D.",
				{ exact: false }
			);
			expect(descriptions).toHaveLength(1);
		});

		it('should display verification checkmark for verified channel in both layouts', () => {
			render(ChannelResult, { props: { result: glitchResult } });

			const checkmarks = screen.getAllByTitle('Verified');
			expect(checkmarks).toHaveLength(2);
			checkmarks.forEach((checkmark) => {
				expect(checkmark.textContent).toBe('✓');
			});
		});

		it('should not display verification checkmark for unverified channel', () => {
			render(ChannelResult, { props: { result: bareChannel } });

			const checkmark = screen.queryByTitle('Verified');
			expect(checkmark).toBeNull();
		});
	});

	describe('Fallback to placeholder', () => {
		it('should use placeholder avatar when avatar is empty', () => {
			render(ChannelResult, { props: { result: bareChannel } });

			const avatars = screen.getAllByAltText(glitchRobloxResult.name);
			expect(avatars).toHaveLength(2);
			avatars.forEach((avatar) => {
				expect(avatar.getAttribute('src')).toBe(avatarPlaceholder);
			});
		});
	});

	describe('Edge cases', () => {
		it('should not render subscriber count when subscriberCount is 0', () => {
			render(ChannelResult, { props: { result: bareChannel } });

			const subCount = screen.queryByText(/subscribers/i);
			expect(subCount).toBeNull();
		});

		it('should not render description when description is null', () => {
			const { container } = render(ChannelResult, { props: { result: bareChannel } });

			const description = container.querySelector('.line-clamp-2');
			expect(description).toBeNull();
		});
	});

	describe('Navigation', () => {
		it('should navigate to correct channel path when desktop avatar is clicked', async () => {
			mockGoto.mockClear();
			const { container } = render(ChannelResult, { props: { result: glitchResult } });

			const buttons = container.querySelectorAll('[role="button"]');
			await fireEvent.click(buttons[0]);

			expect(mockGoto).toHaveBeenCalledWith('/channel/UCn_FAXem2-e3HQvmK-mOH4g');
		});

		it('should navigate when Enter key is pressed on a button', async () => {
			mockGoto.mockClear();
			const { container } = render(ChannelResult, { props: { result: glitchResult } });

			const buttons = container.querySelectorAll('[role="button"]');
			await fireEvent.keyDown(buttons[0], { key: 'Enter' });

			expect(mockGoto).toHaveBeenCalledWith('/channel/UCn_FAXem2-e3HQvmK-mOH4g');
		});

		it('should not navigate when a non-Enter key is pressed', async () => {
			mockGoto.mockClear();
			const { container } = render(ChannelResult, { props: { result: glitchResult } });

			const buttons = container.querySelectorAll('[role="button"]');
			await fireEvent.keyDown(buttons[0], { key: 'Space' });

			expect(mockGoto).not.toHaveBeenCalled();
		});
	});
});
