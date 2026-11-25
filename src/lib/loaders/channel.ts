import { getChannelInfo, getChannelVideos } from '#lib/api/channel.ts';
import {
	adaptChannelInfo,
	adaptChannelTabs,
	adaptChannelVideos,
	type ChannelConfig,
	type ChannelVideoPage
} from '#lib/adapters/channel.ts';
import thumbnailPlaceholder from '#lib/assets/placeholders/thumbnailFallback.svg';
import logoPlaceholder from '#lib/assets/placeholders/logofallback.svg';
import { adaptError } from '#lib/adapters/error.ts';
import { type ChannelPageData } from '../../routes/channel/[channelId]/+page';

/**
 * Creates error page data with safe defaults
 */
function createErrorPageData(error: unknown): ChannelPageData {
	return {
		channel: {
			id: '',
			name: 'Error Loading Channel',
			handle: '',
			avatarUrl: null,
			bannerUrl: null,
			description: null,
			subscriberCount: '0',
			videoCount: 0,
			verified: false
		},
		tabs: [],
		videos: [],
		nextPage: null,
		error: adaptError(error, 'channel')
	};
}

export async function loadChannelData(
	channelId: string,
	fetch: typeof globalThis.fetch
): Promise<ChannelPageData> {
	try {
		const [info, videosResponse] = await Promise.all([
			getChannelInfo(channelId, fetch),
			getChannelVideos(channelId, fetch).catch((error) => {
				console.warn('Failed to fetch channel videos:', error);
				return null;
			})
		]);

		const videoPage: ChannelVideoPage = adaptChannelVideos(
			videosResponse,
			thumbnailPlaceholder,
			logoPlaceholder
		);

		const channel: ChannelConfig = adaptChannelInfo(info, videoPage.items.length);

		return {
			channel,
			tabs: adaptChannelTabs(info.tabs),
			videos: videoPage.items,
			nextPage: videoPage.nextPage
		};
	} catch (error) {
		console.error('Error loading channel data:', error);
		return createErrorPageData(error);
	}
}
