export interface NextPage {
	url: string;
	id?: string;
	ids?: string[];
	body?: string;
}

export interface Replies {
	url: string;
	id: string;
}

export interface UploadDate {
	approximation: boolean;
}

export interface Image {
	url: string;
	height: number;
	width: number;
	estimatedResolutionLevel?: string;
}

export const CHANNEL_TABS = ['videos', 'shorts', 'livestreams', 'playlists', 'albums'] as const;

export type ChannelTabName = (typeof CHANNEL_TABS)[number];
