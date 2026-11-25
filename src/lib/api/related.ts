import { PUBLIC_API_URL } from '$app/env/public';
import type { Image } from '#lib/api/types.ts';
import { apiFetch } from '#lib/api/client.ts';
import { invalidResponse } from '#lib/api/errors.ts';

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
	const res: Response = await apiFetch(
		`${API_BASE_URL}/streams/related?id=${encodeURIComponent(id)}`,
		fetchFn
	);
	const data: unknown = await res.json().catch(() => null);

	if (Array.isArray(data)) {
		return data as RelatedItemApiResponse[];
	}
	const streams: unknown = (data as { streams?: unknown } | null)?.streams;
	if (Array.isArray(streams)) {
		return streams as RelatedItemApiResponse[];
	}
	throw invalidResponse(res.status, 'Unexpected response format for related streams');
}
