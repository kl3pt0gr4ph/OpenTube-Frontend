import { PUBLIC_API_URL } from '$app/env/public';
import type { RelatedItemApiResponse } from '#lib/api/related.ts';
import type { Description } from '#lib/types.ts';
import type { Image } from '#lib/api/types.ts';
import { apiFetchJson } from '#lib/api/client.ts';

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

export function getPlaylist(
	playlistId: string,
	fetchFn?: typeof globalThis.fetch
): Promise<PlaylistApiResponse> {
	return apiFetchJson(`${API_BASE_URL}/playlists?id=${encodeURIComponent(playlistId)}`, fetchFn);
}
