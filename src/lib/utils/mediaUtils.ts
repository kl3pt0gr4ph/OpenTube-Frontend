import type { Image } from '#lib/types.js';

/**
 * Selects the best quality thumbnail from available options
 * Prefers medium quality (index 1), falls back to last available, then first
 */
export function selectBestImage(thumbnails: Image[], fallback: string): string {
	if (!thumbnails || thumbnails.length === 0) return fallback;
	return (
		thumbnails.reduce((best: Image, t: Image): Image => (t.width > best.width ? t : best)).url ||
		fallback
	);
}
