import type { PlayerPreferences } from './preferences';

/**
 * Bandwidth (bits/s) Shaka assumes before it has measured anything, which decides
 * the starting quality. Shaka's own default is 1 Mbps, which starts most videos
 * at 360p; 5 Mbps starts around 720p-1080p and ABR corrects it within seconds.
 */
export const DEFAULT_BANDWIDTH_ESTIMATE = 5_000_000;

export interface AudioPreference {
	language: string;
	role: string;
	label: string;
	channelCount: number;
	codec: string;
}

export interface TextPreference {
	language: string;
	role: string;
	forced: boolean;
}

export interface PlayerConfigOverrides {
	abr: {
		enabled: boolean;
		defaultBandwidthEstimate: number;
		restrictToElementSize: boolean;
		restrictions: { maxHeight: number };
	};
	preferredAudio: AudioPreference[];
	preferredText: TextPreference[];
}

const audioPreference = (language: string, role: string): AudioPreference => ({
	language,
	role,
	label: '',
	channelCount: 2,
	codec: ''
});

/**
 * Builds the Shaka configuration for one load from the viewer's preferences.
 *
 * Applied before every load, so a quality the viewer picked manually on the
 * previous video (which disables ABR) is reset to Auto.
 */
export function buildPlayerConfig(prefs: PlayerPreferences): PlayerConfigOverrides {
	return {
		abr: {
			enabled: true,
			defaultBandwidthEstimate: DEFAULT_BANDWIDTH_ESTIMATE,
			restrictToElementSize: true,
			restrictions: { maxHeight: prefs.maxHeight ?? Infinity }
		},
		preferredAudio: [
			...(prefs.audioLanguage ? [audioPreference(prefs.audioLanguage, '')] : []),
			audioPreference('', 'main')
		],
		preferredText: prefs.textLanguage
			? [{ language: prefs.textLanguage, role: '', forced: false }]
			: []
	};
}
