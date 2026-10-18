import type { PageLoad } from './$types';
import { getKioskInfo, type KioskInfoApiResponse } from '#lib/api/kiosk.js';
import { adaptKioskVideos, type KioskVideoConfig } from '#lib/adapters/kiosk.js';
import defaultThumbnail from '#lib/assets/placeholders/thumbnailFallback.svg';
import defaultAvatar from '#lib/assets/placeholders/logofallback.svg';

const DEFAULT_THUMBNAIL: string = defaultThumbnail;
const DEFAULT_AVATAR: string = defaultAvatar;

const KIOSKS = [
	{ id: 'trending_gaming', title: 'Gaming' },
	{ id: 'trending_movies_and_shows', title: 'Movies & Shows' },
	{ id: 'trending_podcasts_episodes', title: 'Podcasts' },
	{ id: 'trending_music', title: 'Music' }
] as const;

export interface KioskSection {
	id: string;
	title: string;
	videos: KioskVideoConfig[];
}

export const load: PageLoad = async ({ fetch }): Promise<{ sections: KioskSection[] }> => {
	const results: PromiseSettledResult<KioskInfoApiResponse>[] = await Promise.allSettled(
		KIOSKS.map(({ id }): Promise<KioskInfoApiResponse> => getKioskInfo(id, fetch))
	);

	const sections: KioskSection[] = [];

	results.forEach((result: PromiseSettledResult<KioskInfoApiResponse>, index: number): void => {
		const { id, title } = KIOSKS[index];

		if (result.status === 'rejected') {
			console.error(`Kiosk ${id} unavailable, omitting from landing page:`, result.reason);
			return;
		}

		const videos: KioskVideoConfig[] = adaptKioskVideos(
			result.value.items,
			DEFAULT_THUMBNAIL,
			DEFAULT_AVATAR
		);
		if (videos.length > 0) {
			sections.push({ id, title, videos });
		}
	});

	return { sections };
};
