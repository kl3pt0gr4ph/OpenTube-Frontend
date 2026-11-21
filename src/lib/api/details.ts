import type { Details } from '#lib/types.ts';
import { PUBLIC_API_URL } from '$app/env/public';
import { apiFetchJson } from '#lib/api/client.ts';

const API_BASE_URL: string = PUBLIC_API_URL;

/**
 * Fetch video details for a given video ID
 */
export function getVideoDetails(id: string, fetchFn?: typeof globalThis.fetch): Promise<Details> {
	return apiFetchJson(`${API_BASE_URL}/streams/details?id=${encodeURIComponent(id)}`, fetchFn);
}
