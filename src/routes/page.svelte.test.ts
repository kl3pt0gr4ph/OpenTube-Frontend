/**
 * Test Suite: +page.svelte (landing page)
 *
 * Tests for kiosk shelf composition on the landing page
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';
import type { PageData } from './$types';
import kioskVideosFixture from '../tests/fixtures/adapters/kioskVideosAdaptedResponse.json';
import type { KioskVideoConfig } from '$lib/adapters/kiosk';

const kioskVideos: KioskVideoConfig[] = kioskVideosFixture;

const section = (id: string, title: string, videos = kioskVideos.slice(0, 2)) => ({
	id,
	title,
	videos
});

const createMockPageData = (overrides: Partial<PageData> = {}): PageData => ({
	sections: [
		section('trending_gaming', 'Gaming'),
		section('trending_music', 'Music'),
		section('trending_podcasts_episodes', 'Podcasts')
	],
	...overrides
});

describe('+page.svelte - Landing page', () => {
	it('renders one shelf per section', () => {
		render(Page, { props: { data: createMockPageData() } });

		expect(screen.getAllByRole('list')).toHaveLength(3);
		['Gaming', 'Music', 'Podcasts'].forEach((title) =>
			expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
		);
	});

	it('renders shelves in the order supplied by the load function', () => {
		render(Page, { props: { data: createMockPageData() } });

		const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent?.trim());
		expect(titles).toEqual(['Gaming', 'Music', 'Podcasts']);
	});

	it('passes each section its own videos', () => {
		const data = createMockPageData({
			sections: [section('trending_gaming', 'Gaming', kioskVideos.slice(0, 2))]
		});
		render(Page, { props: { data } });

		expect(screen.getByRole('list', { name: 'Gaming' })).toBeInTheDocument();
		expect(screen.getAllByRole('listitem')).toHaveLength(2);
		kioskVideos
			.slice(0, 2)
			.forEach((video) => expect(screen.getByText(video.title)).toBeInTheDocument());
	});

	it('shows the empty state when every kiosk is unavailable', () => {
		render(Page, { props: { data: createMockPageData({ sections: [] }) } });

		expect(screen.getByText(/Nothing to show right now/)).toBeInTheDocument();
		expect(screen.queryAllByRole('list')).toHaveLength(0);
	});

	it('does not show the empty state when at least one shelf survived', () => {
		const data = createMockPageData({ sections: [section('trending_music', 'Music')] });
		render(Page, { props: { data } });

		expect(screen.queryByText(/Nothing to show right now/)).not.toBeInTheDocument();
		expect(screen.getAllByRole('list')).toHaveLength(1);
	});
});
