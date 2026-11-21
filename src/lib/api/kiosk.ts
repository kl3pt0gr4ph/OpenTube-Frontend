import { PUBLIC_API_URL } from '$app/env/public';
import type { Image } from '#lib/api/types.ts';
import { apiFetchJson } from '#lib/api/client.ts';

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
export function getKioskInfo(
	kioskId: string,
	fetchFn?: typeof globalThis.fetch
): Promise<KioskInfoApiResponse> {
	return apiFetchJson(`${API_BASE_URL}/kiosks/${encodeURIComponent(kioskId)}`, fetchFn);
}
