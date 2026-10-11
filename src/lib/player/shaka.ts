export interface ShakaError {
	code: number;
	message: string;
	severity: number;
	category: number;
	data: unknown[];
}

export interface ShakaVideoPreference {
	label?: string;
	role?: string;
	language?: string;
	codec?: string;
	hdrLevel?: string;
	layout?: string;
}

export interface ShakaAudioPreference {
	language?: string;
	role?: string;
	label?: string;
	channelCount?: number;
	codec?: string;
}

export interface ShakaTextPreference {
	language?: string;
	role?: string;
	forced?: boolean;
}

export interface ShakaPlayerConfiguration {
	streaming?: {
		bufferingGoal?: number;
		rebufferingGoal?: number;
		bufferBehind?: number;
	};
	abr?: {
		enabled?: boolean;
		defaultBandwidthEstimate?: number;
		restrictToElementSize?: boolean;
		restrictions?: {
			maxHeight?: number;
		};
	};
	preferredVideo?: ShakaVideoPreference[];
	preferredAudio?: ShakaAudioPreference[];
	preferredText?: ShakaTextPreference[];
	drm?: Record<string, unknown>;
	manifest?: Record<string, unknown>;
}

export interface ShakaUIConfiguration {
	overflowMenuButtons?: string[];
	seekBarColors?: {
		base?: string;
		buffered?: string;
		played?: string;
	};
	controlPanelElements?: string[];
	addSeekBar?: boolean;
	addBigPlayButton?: boolean;
	// bigButtons?: string[];
	trackLabelFormat?: number;
	textTrackLabelFormat?: number;
	showAudioCodec?: boolean;
}

export interface ShakaTrackLabelFormat {
	LANGUAGE: number;
	ROLE: number;
	LANGUAGE_ROLE: number;
	LABEL: number;
	LABEL_OR_LANGUAGE: number;
	LANGUAGE_OR_LABEL: number;
}

export interface ShakaTrack {
	language: string;
	primary: boolean;
	active: boolean;
}

export interface ShakaErrorEvent extends Event {
	detail: ShakaError;
}

export interface ShakaVariantChangedEvent extends Event {
	oldTrack?: ShakaTrack;
	newTrack?: ShakaTrack;
}

export interface ShakaPlayerClass {
	new (video?: HTMLMediaElement): ShakaPlayerInstance;
	isBrowserSupported(): boolean;
}

export interface ShakaNetworkingEngine {
	registerRequestFilter(filter: (type: number, request: ShakaRequest) => void): void;
	unregisterRequestFilter(filter: (type: number, request: ShakaRequest) => void): void;
}

export interface ShakaRetryParameters {
	maxAttempts: number;
	baseDelay: number;
	backoffFactor: number;
	fuzzFactor: number;
	timeout: number;
	stallTimeout: number;
	connectionTimeout: number;
}

export interface ShakaRequest {
	uris: string[];
	method: string;
	body: ArrayBuffer | null;
	headers: Record<string, string>;
	allowCrossSiteCredentials: boolean;
	retryParameters: ShakaRetryParameters;
}

export interface ShakaPlayerInstance {
	attach(video: HTMLMediaElement): Promise<void>;
	load(manifestUri: string, startTime?: number | null, mimeType?: string): Promise<void>;
	configure(config: ShakaPlayerConfiguration): boolean;
	destroy(): Promise<void>;
	addEventListener(type: string, listener: (event: ShakaErrorEvent) => void): void;
	removeEventListener(type: string, listener: (event: ShakaErrorEvent) => void): void;
	getNetworkingEngine(): ShakaNetworkingEngine | null;
	getTextTracks(): ShakaTrack[];
	isTextTrackVisible(): boolean;
	setTextTrackVisibility(visible: boolean): Promise<void> | void;
	getStats(): { estimatedBandwidth: number; streamBandwidth: number };
}

export interface ShakaUIOverlayClass {
	new (
		player: ShakaPlayerInstance,
		videoContainer: HTMLElement,
		video: HTMLMediaElement
	): ShakaUIOverlayInstance;
	TrackLabelFormat: ShakaTrackLabelFormat;
}

export interface ShakaUIOverlayInstance {
	configure(config: ShakaUIConfiguration): void;
	destroy(): Promise<void>;
}

export interface ShakaPolyfill {
	installAll(): void;
}
