import { PUBLIC_API_URL } from '$app/env/public';
import type { Image } from '#lib/types.ts';
import { apiFetch } from '#lib/api/client.ts';
import { invalidResponse } from '#lib/api/errors.ts';

const API_BASE_URL: string = PUBLIC_API_URL;

/**
 * Fetch thumbnail images for a given video ID
 */
export async function getVideoThumbnails(
	id: string,
	fetchFn?: typeof globalThis.fetch
): Promise<Image> {
	const res: Response = await apiFetch(
		`${API_BASE_URL}/streams/thumbnails?id=${encodeURIComponent(id)}`,
		fetchFn
	);
	const thumbnails: unknown = await res.json().catch((): null => null);

	const highQualityThumbnail: Image | undefined = Array.isArray(thumbnails)
		? (thumbnails as Image[]).find((t: Image): boolean => t.estimatedResolutionLevel === 'HIGH') ||
			thumbnails[thumbnails.length - 1]
		: undefined;

	if (!highQualityThumbnail) {
		throw invalidResponse(res.status, `No thumbnails available for video ${id}`);
	}

	return highQualityThumbnail;
}
