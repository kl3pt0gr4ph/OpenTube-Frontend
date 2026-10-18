import { PUBLIC_API_URL } from '$app/env/public';
import type { RelatedItemApiResponse } from '#lib/api/related.js';
import type { Description } from '#lib/types.js';
import type { Image } from '#lib/api/types.js';

const API_BASE_URL: string = PUBLIC_API_URL;

export interface PlaylistApiResponse {
	serviceId: number;
	id: string;
	url: string;
	originalUrl: string;
	name: string;
	errors?: never[];
	relatedItems: RelatedItemApiResponse[];
	contentFilters?: never[];
	sortFilter: string;
	uploaderUrl: string;
	uploaderName: string;
	subChannelUrl?: string;
	subChannelName?: string;
	description: Description;
	banners: Image[];
	uploaderAvatars: Image[];
	subChannelAvatars: Image[];
	thumbnails: Image[];
}

export async function getPlaylist(
	playlistId: string,
	fetchFn?: typeof globalThis.fetch
): Promise<PlaylistApiResponse> {
	const fetcher: {
		(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
		(input: string | URL | Request, init?: RequestInit): Promise<Response>;
	} = fetchFn ?? globalThis.fetch;

	try {
		const res: Response = await fetcher(
			`${API_BASE_URL}/playlists?id=${encodeURIComponent(playlistId)}`
		);

		if (!res.ok) {
			throw new Error(`Failed to fetch playlist ${playlistId}: ${res.status} ${res.statusText}`);
		}
		return await res.json();
	} catch (error) {
		console.error('Error fetching playlist videos:', error);
		throw error;
	}
}
