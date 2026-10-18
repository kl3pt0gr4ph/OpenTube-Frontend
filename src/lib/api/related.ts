import { PUBLIC_API_URL } from '$app/env/public';
import type { Image } from '#lib/api/types.js';

const API_BASE_URL: string = PUBLIC_API_URL;

/**
 * API response for related videos
 */
export interface RelatedItemApiResponse {
	infoType: string;
	serviceId: number;
	url: string;
	name: string;
	thumbnails: Image[];
	streamType?: string;
	uploaderName: string;
	textualUploadDate: string;
	uploadDate?: {
		approximation: boolean;
	};
	viewCount: number;
	duration: number;
	uploaderUrl: string;
	uploaderAvatars: Image[];
	uploaderVerified: boolean;
	isShortFormContent?: boolean;
	subscriberCount: number;
	verified?: boolean;
	streamCount: number;
}

/**
 * Fetch related video streams for a given video ID
 */
export async function getRelatedStreams(
	id: string,
	fetchFn?: typeof globalThis.fetch
): Promise<RelatedItemApiResponse[]> {
	const fetcher = fetchFn ?? globalThis.fetch;

	try {
		const res = await fetcher(`${API_BASE_URL}/streams/related?id=${encodeURIComponent(id)}`);

		if (!res.ok) {
			throw new Error(`Failed to fetch related streams for ${id}: ${res.status} ${res.statusText}`);
		}

		const data = await res.json();

		// Validate data exists first
		if (!data) {
			throw new Error('Unexpected response format for related streams');
		}

		// Handle different response formats
		if (Array.isArray(data)) {
			return data as RelatedItemApiResponse[];
		} else if (data.streams && Array.isArray(data.streams)) {
			return data.streams as RelatedItemApiResponse[];
		} else {
			throw new Error('Unexpected response format for related streams');
		}
	} catch (error) {
		console.error('Error fetching related streams:', error);
		throw error;
	}
}
