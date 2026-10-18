import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import Page from './+page.svelte';
import type { PageData } from './$types';
import searchAdaptedFixtureRaw from '../../tests/fixtures/adapters/searchAdaptedResponse.json';
import type { SearchResultsPage } from '#lib/adapters/search.js';

type Results = PageData['results'];
const searchAdaptedFixture = searchAdaptedFixtureRaw as SearchResultsPage;

describe('+page.svelte - Search Results', () => {
	const [pilotResult, absoluteEndResult, channelResult, playlistResult] =
		searchAdaptedFixture.items;

	const streamResults = [pilotResult, absoluteEndResult];
	const allResults = searchAdaptedFixture.items;

	const emptyResults: SearchResultsPage = { items: [], nextPage: null, hasNextPage: false };

	const withItems = (items: typeof searchAdaptedFixture.items): Results => ({
		items,
		nextPage: null,
		hasNextPage: false
	});

	const createMockPageData = (overrides: Partial<PageData> = {}): PageData => ({
		results: withItems(allResults),
		query: 'test query',
		sortFilter: 'relevance',
		error: null,
		...overrides
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Search query header', () => {
		it('should render a semantic H1 with correct classes when a query is present', () => {
			const data = createMockPageData({ query: 'test search' });
			render(Page, { props: { data } });

			const header = screen.getByText(/Search Results for "test search"/);
			expect(header.tagName).toBe('H1');
		});

		it('should not render a header when query is empty', () => {
			const data = createMockPageData({ query: '' });
			render(Page, { props: { data } });

			expect(screen.queryByText(/Search Results for/)).toBeNull();
		});

		it.each([
			{ name: 'special characters', query: 'test & special <chars>' },
			{ name: 'a very long string', query: 'a'.repeat(200) }
		])('should render header text correctly for a query containing $name', ({ query }) => {
			const data = createMockPageData({ query });
			render(Page, { props: { data } });

			expect(screen.getByText(new RegExp(`Search Results for "${query}"`))).toBeTruthy();
		});
	});

	it('should show the error card, hide results, and still show the query header on error', () => {
		const data = createMockPageData({
			error: 'Network error occurred',
			query: 'test query',
			results: withItems(allResults)
		});
		const { container } = render(Page, { props: { data } });

		const alert = screen.getByRole('alert');
		expect(within(alert).getByText('Search Error')).toBeTruthy();
		expect(within(alert).getByText('Network error occurred')).toBeTruthy();
		expect(within(alert).getByText('Please try again later.')).toBeTruthy();

		expect(screen.getByText(/Search Results for "test query"/)).toBeTruthy();
		expect(container.querySelector('.space-y-4')).toBeNull();
	});

	it('should show the empty-query prompt and hide results when query is empty', () => {
		const data = createMockPageData({ query: '', results: emptyResults });
		const { container } = render(Page, { props: { data } });

		const message = screen.getByText('Enter a search query to find videos');
		expect(message).toHaveClass('text-base', 'text-secondary');
		expect(screen.queryByText(/No results found/)).toBeNull();
		expect(container.querySelector('.space-y-4')).toBeNull();
	});

	it.each([
		{ name: 'multiple results exist', results: withItems(allResults), expectPresent: true },
		{ name: 'results array is empty', results: withItems([]), expectPresent: false },
		{ name: 'results is null', results: null as unknown as Results, expectPresent: false },
		{ name: 'results is undefined', results: undefined as unknown as Results, expectPresent: false }
	])('should show/hide the results list correctly when $name', ({ results, expectPresent }) => {
		const data = createMockPageData({ results });
		const { container } = render(Page, { props: { data } });

		const resultsContainer = container.querySelector('div.space-y-4');
		if (expectPresent) {
			expect(resultsContainer).toBeTruthy();
		} else {
			expect(resultsContainer).toBeNull();
		}
	});

	it.each([
		{
			name: 'a single stream result',
			results: withItems([pilotResult]),
			expectedText: 'Showing 1 result'
		},
		{
			name: 'two stream results',
			results: withItems(streamResults),
			expectedText: 'Showing 2 results'
		},
		{
			name: 'a mixed-type result list',
			results: withItems(allResults),
			expectedText: 'Showing 4 results'
		},
		{
			name: 'a single playlist result',
			results: withItems([playlistResult]),
			expectedText: 'Showing 1 result'
		},
		{
			name: 'a large results array',
			results: withItems(
				Array.from({ length: 50 }, (_, i) => ({
					...pilotResult,
					id: `video-${i}`,
					title: `Video ${i}`
				}))
			),
			expectedText: 'Showing 50 results'
		}
	])('should display the correct pluralised count for $name', ({ results, expectedText }) => {
		const data = createMockPageData({ results });
		const { container } = render(Page, { props: { data } });

		const countEl = screen.getByText(expectedText);
		expect(countEl).toHaveClass('text-sm', 'text-secondary');
		expect(container.querySelector('div.mt-8.text-center')).toBeTruthy();
	});

	it.each([
		{
			name: 'error over results',
			data: { error: 'Test error', results: withItems(allResults) },
			expectText: 'Test error',
			notText: 'Showing 3 results'
		},
		{
			name: 'empty-query prompt over no-results message',
			data: { query: '', results: withItems([]) },
			expectText: 'Enter a search query to find videos',
			notText: 'No results found'
		},
		{
			name: 'no-results message over empty-query prompt',
			data: { query: 'test', results: withItems([]) },
			expectText: 'No results found',
			notText: 'Enter a search query'
		}
	])('should prioritise $name', ({ data: overrides, expectText, notText }) => {
		const data = createMockPageData(overrides);
		render(Page, { props: { data } });

		expect(screen.getByText(new RegExp(expectText))).toBeTruthy();
		expect(screen.queryByText(new RegExp(notText))).toBeNull();
	});

	describe('Result type routing', () => {
		it.each([
			{
				name: 'stream',
				results: withItems([pilotResult]),
				expectedText: 'MURDER DRONES - Pilot'
			},
			{ name: 'channel', results: withItems([channelResult]), expectedText: 'GLITCH' },
			{ name: 'playlist', results: withItems([playlistResult]), expectedText: 'Murder Drones' }
		])('should route $name results to the correct child component', ({ results, expectedText }) => {
			const data = createMockPageData({ results });
			render(Page, { props: { data } });

			expect(screen.getAllByText(expectedText).length).toBeGreaterThan(0);
		});

		it('should render playlist-specific label and video count badge', () => {
			const data = createMockPageData({ results: withItems([playlistResult]) });
			render(Page, { props: { data } });

			expect(screen.getAllByText('Playlist').length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByText('8 videos').length).toBeGreaterThanOrEqual(1);
		});

		it('should render one child component per result in a mixed-type list, in order', () => {
			const data = createMockPageData({
				results: withItems([pilotResult, channelResult, playlistResult])
			});
			const { container } = render(Page, { props: { data } });

			const resultsContainer = container.querySelector('.space-y-4');
			expect(resultsContainer?.children.length).toBe(3);
			expect(screen.getAllByText('MURDER DRONES - Pilot').length).toBeGreaterThan(0);
			expect(screen.getAllByText('GLITCH').length).toBeGreaterThan(0);
			expect(screen.getAllByText('Murder Drones').length).toBeGreaterThan(0);
		});
	});
});
