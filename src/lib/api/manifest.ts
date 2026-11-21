import { PUBLIC_API_URL } from '$app/env/public';
import { DOMParser, type Document, type Element } from '@xmldom/xmldom';
import { parseIsoDuration } from '#lib/utils/formatters.ts';
import { apiFetch } from '#lib/api/client.ts';
import { invalidResponse } from '#lib/api/errors.ts';

const API_BASE_URL: string = PUBLIC_API_URL;

const DASH_NAMESPACE = 'urn:mpeg:dash:schema:mpd:2011';

const MUXED_CONTENT_TYPE = 'text/uri-list';

export interface ManifestApiResponse {
	url: string;
	duration: number;
	videoId?: string;
	isMuxed?: boolean;
}

function isMuxedFallback(res: Response) {
	const contentType: string = res.headers.get('Content-Type') ?? '';
	if (contentType.toLowerCase().startsWith(MUXED_CONTENT_TYPE)) {
		return true;
	}
	return res.headers.get('X-Stream-Type') === 'muxed-progressive';
}

function firstUri(body: string): string {
	return (
		body
			.split(/\r?\n/)
			.map((line: string) => line.trim())
			.find((line: string) => line.length > 0 && !line.startsWith('#')) ?? ''
	);
}

/**
 * Fetch DASH manifest and extract metadata
 * Returns blob URL for player and parsed duration
 */
export async function getManifest(
	id: string,
	fetchFn?: typeof globalThis.fetch
): Promise<ManifestApiResponse> {
	const res: Response = await apiFetch(
		`${API_BASE_URL}/streams/dash?id=${encodeURIComponent(id)}`,
		fetchFn
	);

	// Muxed progressive fallback
	if (isMuxedFallback(res)) {
		const directUrl: string = firstUri(await res.text());
		if (!directUrl) {
			throw invalidResponse(res.status, `Muxed fallback for ${id} returned no URL`);
		}
		console.log(`Muxed progressive fallback for ${id}`);
		return {
			url: directUrl,
			duration: 0,
			isMuxed: true
		};
	}

	const manifestXml: string = await res.text();

	const parser = new DOMParser();
	const xmlDoc: Document = parser.parseFromString(manifestXml, 'text/xml');
	const mpdElement: Element | undefined = xmlDoc.getElementsByTagNameNS(DASH_NAMESPACE, 'MPD')[0];

	const durationStr: string | null = mpdElement?.getAttribute('mediaPresentationDuration');
	const duration: number = parseIsoDuration(durationStr);

	const adaptationSet: Element = xmlDoc.getElementsByTagNameNS(DASH_NAMESPACE, 'AdaptationSet')[0];
	const videoId: string | null = adaptationSet?.getAttribute('id');

	const blob = new Blob([manifestXml], { type: 'application/dash+xml' });
	const url: string = URL.createObjectURL(blob);

	console.log(`Manifest loaded for ${id}: duration=${duration}s, videoId=${videoId || 'not set'}`);

	return {
		url,
		duration,
		videoId: videoId || undefined
	};
}

/**
 * Legacy function for backward compatibility
 * Returns just the URL (for code that hasn't been updated yet)
 */
export async function getManifestUrl(
	id: string,
	fetchFn?: typeof globalThis.fetch
): Promise<string> {
	const manifest: ManifestApiResponse = await getManifest(id, fetchFn);
	return manifest.url;
}
