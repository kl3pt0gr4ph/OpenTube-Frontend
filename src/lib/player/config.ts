import type { PlayerPreferences } from './preferences';

/**
 * Bandwidth (bits/s) Shaka assumes before it has measured anything, which decides
 * the starting quality. Shaka's own default is 1 Mbps, which starts most videos
 * at 360p; 5 Mbps starts around 720p-1080p and ABR corrects it within seconds.
 */
export const DEFAULT_BANDWIDTH_ESTIMATE = 5_000_000;
export const MIN_BANDWIDTH_ESTIMATE = 500_000;
export const MAX_BANDWIDTH_ESTIMATE = 50_000_000;

export interface VideoPreference {
	label: string;
	role: string;
	language: string;
	codec: string;
	hdrLevel: string;
	layout: string;
}

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
	streaming: {
		bufferingGoal: number;
		rebufferingGoal: number;
	};
	preferredVideo: VideoPreference[];
	preferredAudio: AudioPreference[];
	preferredText: TextPreference[];
}

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

const videoPreference = (codec: string): VideoPreference => ({
	label: '',
	role: '',
	language: '',
	codec,
	hdrLevel: 'AUTO',
	layout: ''
});

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
			defaultBandwidthEstimate: clamp(
				prefs.bandwidthEstimate ?? DEFAULT_BANDWIDTH_ESTIMATE,
				MIN_BANDWIDTH_ESTIMATE,
				MAX_BANDWIDTH_ESTIMATE
			),
			restrictToElementSize: true,
			restrictions: { maxHeight: prefs.maxHeight ?? Infinity }
		},
		streaming: {
			bufferingGoal: 30,
			rebufferingGoal: 5
		},
		preferredAudio: [
			...(prefs.audioLanguage ? [audioPreference(prefs.audioLanguage, '')] : []),
			audioPreference('', 'main')
		],
		preferredVideo: [videoPreference('av01'), videoPreference('vp09'), videoPreference('avc1')],
		preferredText: prefs.textLanguage
			? [{ language: prefs.textLanguage, role: '', forced: false }]
			: []
	};
}
