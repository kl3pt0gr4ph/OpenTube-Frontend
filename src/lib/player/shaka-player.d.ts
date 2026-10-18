declare module 'shaka-player' {
	import type {
		ShakaErrorEvent,
		ShakaPlayerClass,
		ShakaPlayerConfiguration,
		ShakaPolyfill,
		ShakaUIConfiguration,
		ShakaUIOverlayClass
	} from '#lib/player/shaka.js';

	export const Player: ShakaPlayerClass;
	export const ui: {
		Overlay: ShakaUIOverlayClass;
	};
	export const polyfill: ShakaPolyfill;

	export type PlayerConfiguration = ShakaPlayerConfiguration;
	export type UIConfiguration = ShakaUIConfiguration;
	export type ErrorEvent = ShakaErrorEvent;
}

declare module 'shaka-player/dist/shaka-player.ui' {
	import type {
		ShakaErrorEvent,
		ShakaPlayerClass,
		ShakaPlayerConfiguration,
		ShakaPolyfill,
		ShakaUIConfiguration,
		ShakaUIOverlayClass
	} from '#lib/player/shaka.js';

	const shaka: {
		Player: ShakaPlayerClass;
		ui: {
			Overlay: ShakaUIOverlayClass;
		};
		polyfill: ShakaPolyfill;
	};

	export default shaka;

	export type PlayerConfiguration = ShakaPlayerConfiguration;
	export type UIConfiguration = ShakaUIConfiguration;
	export type ErrorEvent = ShakaErrorEvent;
}
