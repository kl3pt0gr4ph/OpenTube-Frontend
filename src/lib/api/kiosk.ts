import { PUBLIC_API_URL } from '$app/env/public';
import type { Image } from '#lib/api/types.js';

const API_BASE_URL: string = PUBLIC_API_URL;

export interface KioskInfoApiResponse {
	id: string;
	name: string;
	url: string;
	items: KioskApiResponseItem[];
}

export interface KioskApiResponseItem {
	name: string;
	url: string;
	uploaderName: string;
	uploaderUrl: string;
	uploaderAvatars: Image[];
	uploaderVerified: boolean;
	duration: number;
	viewCount: number;
	uploadDate: string;
	textualUploadDate: string;
	streamType: string;
	thumbnails: Image[];
}

/**
 * Fetch kiosk info for a specified kiosk ID
 */
export async function getKioskInfo(
	kioskId: string,
	fetchFn?: typeof globalThis.fetch
): Promise<KioskInfoApiResponse> {
	const fetcher: {
		(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
		(input: string | URL | Request, init?: RequestInit): Promise<Response>;
	} = fetchFn ?? globalThis.fetch;

	try {
		const res: Response = await fetcher(`${API_BASE_URL}/kiosks/${encodeURIComponent(kioskId)}`);

		if (!res.ok) {
			throw new Error(`Failed to fetch ${kioskId} kiosk info: ${res.status} ${res.statusText}`);
		}

		return await res.json();
	} catch (error) {
		console.error('Error fetching channel info:', error);
		throw error;
	}
}
