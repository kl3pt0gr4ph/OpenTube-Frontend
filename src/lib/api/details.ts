import type { Details } from '#lib/types.js';
import { PUBLIC_API_URL } from '$app/env/public';

const API_BASE_URL = PUBLIC_API_URL;

/**
 * Fetch video details for a given video ID
 */
export async function getVideoDetails(
	id: string,
	fetchFn?: typeof globalThis.fetch
): Promise<Details> {
	const fetcher = fetchFn ?? globalThis.fetch;

	try {
		const res = await fetcher(`${API_BASE_URL}/streams/details?id=${encodeURIComponent(id)}`);

		if (!res.ok) {
			throw new Error(`Failed to fetch video details for ${id}: ${res.status} ${res.statusText}`);
		}

		return await res.json();
	} catch (error) {
		console.error('Error fetching video details:', error);
		throw error;
	}
}
