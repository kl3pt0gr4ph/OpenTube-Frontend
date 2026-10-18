/**
 * Test Suite: KioskCarousel.svelte
 *
 * Tests for the reusable kiosk shelf component
 */

import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import KioskCarousel from './KioskCarousel.svelte';
import kioskVideosFixture from '../../tests/fixtures/adapters/kioskVideosAdaptedResponse.json';
import type { KioskVideoConfig } from '$lib/adapters/kiosk';

const mockKioskVideos: KioskVideoConfig[] = kioskVideosFixture;
const [heartbeat] = mockKioskVideos;
const noNumbers = mockKioskVideos.find((v) => v.id === 'no-numbers-id')!;

const props = (videos: KioskVideoConfig[] = mockKioskVideos) => ({ title: 'Podcasts', videos });

function stubTrackMetrics(
	container: HTMLElement,
	{ scrollWidth = 1200, clientWidth = 300, scrollLeft = 0 } = {}
): HTMLElement {
	const track = container.querySelector('[role="list"]') as HTMLElement;
	Object.defineProperty(track, 'scrollWidth', { value: scrollWidth, configurable: true });
	Object.defineProperty(track, 'clientWidth', { value: clientWidth, configurable: true });
	track.scrollLeft = scrollLeft;
	track.scrollBy = vi.fn();
	return track;
}

describe('KioskCarousel', () => {
	it('renders the kiosk title as a heading', () => {
		render(KioskCarousel, { props: props() });
		expect(screen.getByRole('heading', { name: 'Podcasts' })).toBeInTheDocument();
	});

	it('renders a card for every video', () => {
		render(KioskCarousel, { props: props() });
		mockKioskVideos.forEach((v) => expect(screen.getByText(v.title)).toBeInTheDocument());
	});

	it('renders the heading but no cards when there are no videos', () => {
		render(KioskCarousel, { props: props([]) });

		expect(screen.getByRole('heading', { name: 'Podcasts' })).toBeInTheDocument();
		expect(screen.queryAllByRole('listitem')).toHaveLength(0);
	});

	it('renders each thumbnail with its source', () => {
		render(KioskCarousel, { props: props() });

		for (const video of mockKioskVideos) {
			expect(screen.getByAltText(`${video.title} thumbnail`)).toHaveAttribute(
				'src',
				video.thumbnail
			);
		}
	});

	it('renders each channel avatar with its source', () => {
		const { container } = render(KioskCarousel, { props: props() });

		const withAvatar = mockKioskVideos.filter((v) => v.channelAvatar);
		const avatars = container.querySelectorAll('img[alt=""]');

		expect(avatars).toHaveLength(withAvatar.length);
		avatars.forEach((img, i) => expect(img).toHaveAttribute('src', withAvatar[i].channelAvatar));
	});

	it('links each card to the video route', () => {
		const { container } = render(KioskCarousel, { props: props() });

		expect(container.querySelectorAll('a[href^="/video/"]')).toHaveLength(
			mockKioskVideos.length * 2
		);
		expect(screen.getByRole('link', { name: heartbeat.title })).toHaveAttribute(
			'href',
			`/video/${heartbeat.id}`
		);
	});

	describe('unknown metadata', () => {
		it('renders duration and view count when present', () => {
			render(KioskCarousel, { props: props([heartbeat]) });
			expect(screen.getByRole('link', { name: heartbeat.title })).toHaveAttribute(
				'href',
				`/video/${heartbeat.id}`
			);

			expect(screen.getByText('1:00:41')).toBeInTheDocument();
			expect(screen.getByText(/128,400 views/)).toBeInTheDocument();
		});

		it('omits the duration badge and view count when they are zero', () => {
			const { container } = render(KioskCarousel, { props: props([noNumbers]) });

			expect(screen.queryByText('0:00')).not.toBeInTheDocument();
			expect(screen.queryByText(/views/)).not.toBeInTheDocument();
			expect(container.querySelector('span[aria-hidden="true"]')).not.toBeInTheDocument();
			expect(screen.getByText(noNumbers.uploadDate)).toBeInTheDocument();
		});
	});

	describe('paging', () => {
		it('disables both arrows when the content fits', async () => {
			const { container } = render(KioskCarousel, { props: props() });
			const track = stubTrackMetrics(container, { scrollWidth: 300, clientWidth: 300 });

			await fireEvent.scroll(track);

			expect(screen.getByRole('button', { name: 'Scroll Podcasts left' })).toBeDisabled();
			expect(screen.getByRole('button', { name: 'Scroll Podcasts right' })).toBeDisabled();
		});

		it('scrolls forward by most of a viewport width', async () => {
			const { container } = render(KioskCarousel, { props: props() });
			const track = stubTrackMetrics(container);

			await fireEvent.scroll(track);
			await fireEvent.click(screen.getByRole('button', { name: 'Scroll Podcasts right' }));

			expect(track.scrollBy).toHaveBeenCalledWith({ left: 270, behavior: 'smooth' });
		});

		it('enables the left arrow once scrolled away from the start', async () => {
			const { container } = render(KioskCarousel, { props: props() });
			const track = stubTrackMetrics(container, { scrollLeft: 270 });

			await fireEvent.scroll(track);

			expect(screen.getByRole('button', { name: 'Scroll Podcasts left' })).toBeEnabled();
		});
	});

	it('exposes the track as a labelled list', () => {
		render(KioskCarousel, { props: props() });

		expect(screen.getByRole('list', { name: 'Podcasts' })).toBeInTheDocument();
		expect(screen.getAllByRole('listitem')).toHaveLength(mockKioskVideos.length);
	});
});
