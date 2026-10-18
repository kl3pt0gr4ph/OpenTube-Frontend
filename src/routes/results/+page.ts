import { getSearchResults, type SearchApiResponse } from '#lib/api/search.js';
import { adaptSearchResults, type SearchResultsPage } from '#lib/adapters/search.js';
import thumbnailPlaceholder from '#lib/assets/placeholders/thumbnailFallback.svg';
import avatarPlaceholder from '#lib/assets/placeholders/logofallback.svg';
import type { PageLoad } from './$types';

const emptyResults: SearchResultsPage = { items: [], nextPage: null, hasNextPage: false };

export interface LoadSearchResponse {
	results: SearchResultsPage;
	query: string;
	sortFilter?: string;
	error: string | null;
}

export const load: PageLoad = async ({ url, fetch }): Promise<LoadSearchResponse> => {
	try {
		const query: string = url.searchParams.get('query') ?? '';
		const sortFilter: string = url.searchParams.get('sort') ?? 'asc';

		if (!query.trim()) {
			return {
				results: emptyResults,
				query: '',
				error: null
			};
		}

		// Fetch raw search data from API
		const searchData: SearchApiResponse = await getSearchResults(query, sortFilter, fetch);

		// Transform data using adapter
		const results: SearchResultsPage = adaptSearchResults(
			searchData,
			thumbnailPlaceholder,
			avatarPlaceholder
		);

		return {
			results,
			query,
			sortFilter,
			error: null
		};
	} catch (error) {
		console.error('Error loading search results:', error);
		return {
			results: emptyResults,
			query: url.searchParams.get('query') ?? '',
			sortFilter: url.searchParams.get('sort') ?? 'asc',
			error: error instanceof Error ? error.message : 'Failed to load search results'
		};
	}
};
