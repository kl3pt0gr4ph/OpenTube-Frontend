import { PUBLIC_API_URL } from '$app/env/public';
import type { NextPage } from '#lib/api/types.js';

const API_BASE_URL = PUBLIC_API_URL;

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
export async function getSearchResults(
	query: string,
	sortFilter: string,
	fetchFn?: typeof globalThis.fetch
): Promise<SearchApiResponse> {
	const fetcher: {
		(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
		(input: string | URL | Request, init?: RequestInit): Promise<Response>;
	} = fetchFn ?? globalThis.fetch;

	try {
		const res: Response = await fetcher(
			`${API_BASE_URL}/search?searchString=${encodeURIComponent(query)}&sortFilter=${encodeURIComponent(sortFilter)}`
		);

		if (!res.ok) {
			throw new Error(
				`Could not load search results for ${query}: ${res.status} ${res.statusText}`
			);
		}

		return await res.json();
	} catch (error) {
		console.error('Error fetching search results:', error);
		throw error;
	}
}

export async function getSearchResultsNextPage(
	query: string,
	pageUrl: string,
	pageId: string,
	sortFilter: string,
	fetchFn?: typeof globalThis.fetch
): Promise<NextPageSearchApiResponse> {
	const fetcher: {
		(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
		(input: string | URL | Request, init?: RequestInit): Promise<Response>;
	} = fetchFn ?? globalThis.fetch;

	try {
		const res: Response = await fetcher(
			`${API_BASE_URL}/search/page?searchString=${encodeURIComponent(query)}&pageUrl=${encodeURIComponent(pageUrl)}&pageId=${encodeURIComponent(pageId)}&sortFilter=${encodeURIComponent(sortFilter)}`
		);

		if (!res.ok) {
			throw new Error(
				`Could not load search results for ${query}: ${res.status} ${res.statusText}`
			);
		}

		return await res.json();
	} catch (error) {
		console.error('Error fetching next page search results:', error);
		throw error;
	}
}
