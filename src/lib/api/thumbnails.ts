import { PUBLIC_API_URL } from '$app/env/public';
import type { Image } from '#lib/types.js';

const API_BASE_URL = PUBLIC_API_URL;

/**
 * Fetch thumbnail images for a given video ID
 */
export async function getVideoThumbnails(
	id: string,
	fetchFn?: typeof globalThis.fetch
): Promise<Image> {
	const fetcher = fetchFn ?? globalThis.fetch;

	try {
		const res = await fetcher(`${API_BASE_URL}/streams/thumbnails?id=${encodeURIComponent(id)}`);

		if (!res.ok) {
			throw new Error(`Failed to fetch thumbnails for ${id}: ${res.status} ${res.statusText}`);
		}

		const thumbnails: Image[] = await res.json();

		const highQualityThumbnail =
			thumbnails.find((t) => t.estimatedResolutionLevel === 'HIGH') ||
			thumbnails[thumbnails.length - 1] ||
			thumbnails[0];

		if (!highQualityThumbnail) {
			throw new Error(`No thumbnails available for video ${id}`);
		}

		return highQualityThumbnail;
	} catch (error) {
		console.error('Error fetching video thumbnails:', error);
		throw error;
	}
}
