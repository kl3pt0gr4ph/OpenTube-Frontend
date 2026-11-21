import { PUBLIC_API_URL } from '$app/env/public';
import type { NextPage } from '#lib/api/types.ts';
import { apiFetchJson } from '#lib/api/client.ts';

const API_BASE_URL: string = PUBLIC_API_URL;

export interface SearchApiResponse {
	correctedSearch?: boolean;
	url: string;
	originalUrl: string;
	name: string;
	searchString: string;
	searchSuggestion: string;
	isCorrectedSearch: boolean;
	items: SearchApiResponseData[];
	nextPage: NextPage;
	hasNextPage: boolean;
}

export interface NextPageSearchApiResponse {
	items: SearchApiResponseData[];
	nextPage: NextPage;
	hasNextPage: boolean;
	itemCount: number;
}

export interface SearchApiResponseData {
	shortFormContent: boolean;
	type: string;
	name: string;
	url: string;
	thumbnailUrl: string;
	uploaderName: string;
	uploaderAvatarUrl: string;
	uploaderVerified: boolean;
	duration?: number;
	viewCount?: number;
	subscriberCount?: number;
	videoCount?: number;
	uploadDate?: string;
	streamType?: string;
	isShortFormContent?: boolean;
	uploaderUrl?: string;
	description?: string;
}

/**
 * Fetch search results for a given search query
 */
export function getSearchResults(
	query: string,
	sortFilter: string,
	fetchFn?: typeof globalThis.fetch
): Promise<SearchApiResponse> {
	return apiFetchJson(
		`${API_BASE_URL}/search?searchString=${encodeURIComponent(query)}&sortFilter=${encodeURIComponent(sortFilter)}`,
		fetchFn
	);
}

export function getSearchResultsNextPage(
	query: string,
	pageUrl: string,
	pageId: string,
	sortFilter: string,
	fetchFn?: typeof globalThis.fetch
): Promise<NextPageSearchApiResponse> {
	return apiFetchJson(
		`${API_BASE_URL}/search/page?searchString=${encodeURIComponent(query)}&pageUrl=${encodeURIComponent(pageUrl)}&pageId=${encodeURIComponent(pageId)}&sortFilter=${encodeURIComponent(sortFilter)}`,
		fetchFn
	);
}
