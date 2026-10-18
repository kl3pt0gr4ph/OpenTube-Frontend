import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import VideoResult from './VideoResult.svelte';
import searchResultFixtures from '../../../tests/fixtures/adapters/searchAdaptedResponse.json';
import thumbnailFallback from '#lib/assets/placeholders/thumbnailFallback.svg?raw';
import avatarFallback from '#lib/assets/placeholders/logofallback.svg?raw';
import type { VideoSearchResultConfig } from '#lib/adapters/search.js';

// Mock asset imports
vi.mock('#lib/assets/placeholder/thumbnail-placeholder.jpg', () => ({
	default: '/placeholder-thumbnail.jpg'
}));

vi.mock('#lib/assets/placehoder/logo-placeholder.svg', () => ({
	default: '/placeholder-avatar.svg'
}));

describe('VideoResult', () => {
	const [pilotResult, absoluteEndResult] = searchResultFixtures.items as VideoSearchResultConfig[];

	describe('Rendering with real data', () => {
		it('should render video title from result prop in both layouts', () => {
			render(VideoResult, { props: { result: pilotResult } });

			const titles = screen.getAllByText('MURDER DRONES - Pilot');
			expect(titles).toHaveLength(2); // Desktop + Mobile
			titles.forEach((title) => expect(title).toBeTruthy());
		});

		it('should render video thumbnail from result prop in both layouts', () => {
			render(VideoResult, { props: { result: pilotResult } });

			const thumbnails = screen.getAllByAltText('MURDER DRONES - Pilot thumbnail');
			expect(thumbnails).toHaveLength(2);
			thumbnails.forEach((thumbnail) => {
				expect(thumbnail).toBeTruthy();
				expect(thumbnail.getAttribute('src')).toBe('https://i.ytimg.com/vi/pilot-id/hq720.jpg');
			});
		});

		it('should render channel name from result prop in both layouts', () => {
			render(VideoResult, { props: { result: pilotResult } });

			const channelNames = screen.getAllByText('GLITCH', { exact: false });
			expect(channelNames.length).toBeGreaterThanOrEqual(2);
		});

		it('should render channel avatar from result prop in both layouts', () => {
			render(VideoResult, { props: { result: pilotResult } });

			const avatars = screen.getAllByAltText('GLITCH');
			expect(avatars).toHaveLength(2);
			avatars.forEach((avatar) => {
				expect(avatar).toBeTruthy();
				expect(avatar.getAttribute('src')).toBe('https://yt3.ggpht.com/random-unicode-characters');
			});
		});

		it('should render description from result prop in both layouts when present', () => {
			const resultWithDescription: VideoSearchResultConfig = {
				...pilotResult,
				description: 'This is a test video description that should be displayed.'
			};
			render(VideoResult, { props: { result: resultWithDescription } });

			const descriptions = screen.getAllByText(
				'This is a test video description that should be displayed.'
			);
			expect(descriptions).toHaveLength(2);
			descriptions.forEach((desc) => expect(desc).toBeTruthy());
		});

		it('should render formatted view count using formatCount in both layouts', () => {
			render(VideoResult, { props: { result: pilotResult } });

			const viewCounts = screen.getAllByText('10,717,139 views', { exact: false });
			expect(viewCounts).toHaveLength(2);
		});

		it('should render formatted upload date using formatDate in both layouts', () => {
			render(VideoResult, { props: { result: pilotResult } });

			const uploadDates = screen.getAllByText('Nov 13, 2025', { exact: false });
			expect(uploadDates).toHaveLength(2);
		});

		it('should display verification checkmark for verified channel in both layouts', () => {
			render(VideoResult, { props: { result: pilotResult } });

			const checkmarks = screen.getAllByTitle('Verified');
			expect(checkmarks).toHaveLength(2);
			checkmarks.forEach((checkmark) => {
				expect(checkmark).toBeTruthy();
				expect(checkmark.textContent).toBe('✓');
			});
		});

		it('should not display verification checkmark for unverified channel', () => {
			render(VideoResult, { props: { result: absoluteEndResult } });

			const checkmark = screen.queryByTitle('Verified');
			expect(checkmark).toBeNull();
		});
	});

	describe('Fallback to placeholders', () => {
		it('should use placeholder thumbnail when thumbnail is empty', () => {
			render(VideoResult, { props: { result: absoluteEndResult } });

			const thumbnails = screen.getAllByAltText('MURDER DRONES - Absolute End thumbnail');
			expect(thumbnails).toHaveLength(2);
			thumbnails.forEach((thumbnail) => {
				expect(thumbnail.getAttribute('src')).toBe('default-thumbnail.jpg');
			});
		});

		it('should use placeholder avatar when channelAvatar is empty', () => {
			render(VideoResult, { props: { result: absoluteEndResult } });

			const avatars = screen.getAllByAltText('Unknown Channel');
			expect(avatars).toHaveLength(2);
			avatars.forEach((avatar) => {
				expect(avatar.getAttribute('src')).toBe('default-avatar.jpg');
			});
		});

		it('falls back to placeholder assets when thumbnail/avatar are empty strings', () => {
			const bare = { ...pilotResult, thumbnail: '', channelAvatar: '' };
			render(VideoResult, { props: { result: bare } });
			screen
				.getAllByAltText('MURDER DRONES - Pilot thumbnail')
				.forEach((t) => expect(t.getAttribute('src')).toBe(thumbnailFallback));
			screen
				.getAllByAltText('GLITCH')
				.forEach((a) => expect(a.getAttribute('src')).toBe(avatarFallback));
		});
	});

	describe('Edge cases', () => {
		it('should handle zero view count', () => {
			render(VideoResult, { props: { result: absoluteEndResult } });

			const viewCount = screen.getAllByText('0 views', { exact: false });
			expect(viewCount).toBeTruthy();
		});

		it('should handle empty description', () => {
			const { container } = render(VideoResult, { props: { result: absoluteEndResult } });

			const desktopDescription = container.querySelector('.hidden.sm\\:grid p.line-clamp-3');
			expect(desktopDescription).toBeTruthy();

			const mobileDescription = container.querySelector('.sm\\:hidden p.line-clamp-2');
			expect(mobileDescription).toBeTruthy();
		});

		it('should handle missing upload date gracefully', () => {
			const { container } = render(VideoResult, { props: { result: absoluteEndResult } });

			// Should still render the component without crashing
			const title = screen.getAllByText('MURDER DRONES - Absolute End');
			expect(title).toBeTruthy();

			// Desktop layout
			const desktopDateSection = container.querySelector('.hidden.sm\\:grid p.text-sm.text-muted');
			expect(desktopDateSection).toBeTruthy();

			// Mobile layout
			const mobileDateSection = container.querySelector('.sm\\:hidden p.text-xs.text-muted');
			expect(mobileDateSection).toBeTruthy();
		});
	});
});
