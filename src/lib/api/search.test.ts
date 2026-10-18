/**
 * Test Suite: search.ts
 *
 * Tests for video search functionality including query handling,
 * response parsing, and error scenarios
 */

import { describeJsonFetcher } from '../../tests/helpers/describeJsonFetcher';
import searchResultsFixture from '../../tests/fixtures/api/searchApiResponse.json';
import {
	getSearchResults,
	getSearchResultsNextPage,
	type NextPageSearchApiResponse,
	type SearchApiResponseData
} from '#lib/api/search.js';
import { describe, it, expect, vi } from 'vitest';
import { createSuccessfulFetch, extractQueryParams } from '../../tests/helpers/apiHelpers';

export const nextPageSearchResultsFixture: NextPageSearchApiResponse = {
	items: searchResultsFixture.items as SearchApiResponseData[],
	nextPage: {
		url: 'https://www.youtube.com/youtubei/v1/search?prettyPrint=false',
		id: 'EqADEgNsdHQamANTQ2lDQVF0TVdVMTJTbGMxY2xsTlJZSUJDMjlsY1ZWSVJYQTB'
	},
	hasNextPage: true,
	itemCount: 20
};

describeJsonFetcher({
	name: 'getSearchResults',
	call: (id, fetchFn) => getSearchResults(id, 'relevance', fetchFn),
	endpoint: '/search',
	idParam: 'searchString',
	fixture: searchResultsFixture
});

describeJsonFetcher({
	name: 'getSearchResultsNextPage',
	call: (id: string, fetchFn) =>
		getSearchResultsNextPage(
			id,
			'https://www.youtube.com/youtubei/v1/search?prettyPrint=false',
			'EqADEgNsdHQamANTQ2lDQVF0TVdVMTJTbGMxY2xsTlJZSUJDMjlsY1ZWSVJYQTB',
			'relevance',
			fetchFn
		),
	endpoint: '/search/page',
	idParam: 'searchString',
	fixture: nextPageSearchResultsFixture
});

describe('getSearchResults sort filter', () => {
	it('URL-encodes the sort filter into the request', async () => {
		const fetchFn = createSuccessfulFetch(searchResultsFixture);
		await getSearchResults('cats', 'upload date', fetchFn as never);
		const url = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
		expect(extractQueryParams(url).sortFilter).toBe('upload date');
	});
});
