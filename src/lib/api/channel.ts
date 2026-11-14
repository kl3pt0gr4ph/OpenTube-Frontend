import { PUBLIC_API_URL } from '$app/env/public';
import type { ChannelTabName, Image, NextPage } from '#lib/api/types.js';

const API_BASE_URL: string = PUBLIC_API_URL;

export interface ChannelVideoApiResponseItem {
	infoType: 'STREAM';
	url: string;
	name: string;
	uploaderName: string;
	uploaderUrl: string | null;
	uploaderVerified: boolean;
	duration: number;
	viewCount: number;
	textualUploadDate: string | null;
	thumbnails: Image[];
	isShortFormContent?: boolean;
}

export interface ChannelPlaylistApiResponseItem {
	infoType: 'PLAYLIST';
	url: string;
	name: string;
	uploaderName: string | null;
	uploaderUrl: string | null;
	uploaderVerified: boolean;
	streamCount: number;
	playlistType: string | null;
	thumbnails: Image[];
}

export interface ChannelTabChannelApiResponseItem {
	infoType: 'CHANNEL';
	url: string;
	name: string;
	description: string | null;
	subscriberCount: number;
	streamCount: number;
	verified: boolean;
	thumbnails: Image[];
}

export type ChannelTabApiResponseItem =
	ChannelVideoApiResponseItem | ChannelPlaylistApiResponseItem | ChannelTabChannelApiResponseItem;

export interface ChannelTabLinkApiResponse {
	url: string;
	id: string;
	contentFilters: string[];
}

export interface ChannelInfoApiResponse {
	id: string;
	name: string;
	avatarUrl: string;
	bannerUrl: string;
	description: string;
	subscriberCount: number;
	handle: string | null;
	verified: boolean;
	tabs: ChannelTabLinkApiResponse[];
	avatars: Image[];
	banners: Image[];
}

export interface ChannelTabApiResponse {
	tab: string;
	channelId: string;
	items: ChannelTabApiResponseItem[];
	/** Absent on the last page */
	nextPage: NextPage | null;
}

export interface ChannelVideosApiResponse extends ChannelTabApiResponse {
	items: ChannelVideoApiResponseItem[];
}

/**
 * Fetch channel info (banner, avatar, name, description, etc.)
 */
export async function getChannelInfo(
	channelId: string,
	fetchFn?: typeof globalThis.fetch
): Promise<ChannelInfoApiResponse> {
	const fetcher: {
		(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
		(input: string | URL | Request, init?: RequestInit): Promise<Response>;
	} = fetchFn ?? globalThis.fetch;

	try {
		const res: Response = await fetcher(
			`${API_BASE_URL}/channels?id=${encodeURIComponent(channelId)}`
		);

		if (!res.ok) {
			throw new Error(
				`Failed to fetch channel info for ${channelId}: ${res.status} ${res.statusText}`
			);
		}

		return await res.json();
	} catch (error) {
		console.error('Error fetching channel info:', error);
		throw error;
	}
}

/**
 * Fetch the first page of a channel tab.
 * Asking for a tab the channel doesn't have is an error, not an empty page -
 * check the channel's `tabs` first.
 */
export async function getChannelTab(
	channelId: string,
	tab: ChannelTabName,
	fetchFn?: typeof globalThis.fetch
): Promise<ChannelTabApiResponse> {
	const fetcher: {
		(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
		(input: string | URL | Request, init?: RequestInit): Promise<Response>;
	} = fetchFn ?? globalThis.fetch;

	try {
		const res: Response = await fetcher(
			`${API_BASE_URL}/channels/tab?id=${encodeURIComponent(channelId)}&tab=${encodeURIComponent(tab)}`
		);

		if (!res.ok) {
			throw new Error(
				`Failed to fetch channel ${tab} for ${channelId}: ${res.status} ${res.statusText}`
			);
		}
		return await res.json();
	} catch (error) {
		console.error(`Error fetching channel ${tab}:`, error);
		throw error;
	}
}

/**
 * Fetch the next page of a channel tab.
 * `nextPage` is the cursor from the previous response; all three of its fields
 * are passed back unmodified, as the API requires.
 */
export async function getChannelTabNextPage(
	channelId: string,
	tab: ChannelTabName,
	nextPage: NextPage,
	fetchFn?: typeof globalThis.fetch
): Promise<ChannelTabApiResponse> {
	const fetcher = fetchFn ?? globalThis.fetch;

	const pageIds: string = (nextPage.ids ?? [])
		.map((id: string): string => `&pageIds=${encodeURIComponent(id)}`)
		.join('');

	try {
		const res: Response = await fetcher(
			`${API_BASE_URL}/channels/tab/page?channelId=${encodeURIComponent(channelId)}&tab=${encodeURIComponent(tab)}&pageUrl=${encodeURIComponent(nextPage.url ?? '')}&pageBody=${encodeURIComponent(nextPage.body ?? '')}${pageIds}`
		);

		if (!res.ok) {
			throw new Error(
				`Failed to fetch next page of channel ${tab} for ${channelId}: ${res.status} ${res.statusText}`
			);
		}
		return await res.json();
	} catch (error) {
		console.error(`Error fetching next page of channel ${tab}:`, error);
		throw error;
	}
}

/**
 * Fetch the first page of videos uploaded by a channel
 */
export function getChannelVideos(
	channelId: string,
	fetchFn?: typeof globalThis.fetch
): Promise<ChannelVideosApiResponse> {
	return getChannelTab(channelId, 'videos', fetchFn) as Promise<ChannelVideosApiResponse>;
}

/**
 * Fetch the next page of videos uploaded by a channel
 */
export async function getChannelVideosNextPage(
	channelId: string,
	channelName: string,
	pageUrl: string,
	pageBody: string,
	verification: string,
	fetchFn?: typeof globalThis.fetch
): Promise<ChannelVideosApiResponse> {
	const fetcher: {
		(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
		(input: string | URL | Request, init?: RequestInit): Promise<Response>;
	} = fetchFn ?? globalThis.fetch;

	try {
		const res: Response = await fetcher(
			`${API_BASE_URL}/channels/tab/page?channelId=${encodeURIComponent(channelId)}&tab=videos&pageUrl=${encodeURIComponent(pageUrl)}&pageBody=${encodeURIComponent(pageBody)}&pageIds=${encodeURIComponent(channelName)}&pageIds=https://www.youtube.com/channel/${encodeURIComponent(channelId)}&pageIds=${encodeURIComponent(verification)}`
		);

		if (!res.ok) {
			throw new Error(
				`Failed to fetch next page of channel videos for ${channelId}: ${res.status} ${res.statusText}`
			);
		}
		return await res.json();
	} catch (error) {
		console.error('Error fetching next page of channel videos:', error);
		throw error;
	}
}
