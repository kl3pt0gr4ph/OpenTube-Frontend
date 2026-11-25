import type { PageLoad } from '../../$types';
import { loadChannelData } from '#lib/loaders/channel.ts';
import type { ChannelConfig, ChannelVideoConfig } from '#lib/adapters/channel.ts';
import type { ChannelTabName, NextPage } from '#lib/api/types.ts';
import type { ErrorConfig } from '#lib/adapters/error.ts';

/**
 * Page load function - fetches channel info and the first page of videos in parallel.
 * The other tabs are fetched by the page the first time they are opened.
 */
export const load: PageLoad = async ({ params, fetch }) =>
	loadChannelData((params as Record<string, string>).channelId, fetch);

export interface ChannelPageData {
	channel: ChannelConfig;
	tabs: ChannelTabName[];
	videos: ChannelVideoConfig[];
	nextPage: NextPage | null;
	error?: ErrorConfig;
}
