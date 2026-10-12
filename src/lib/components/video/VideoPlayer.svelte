<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { SvelteURL } from 'svelte/reactivity';
	import { browser } from '$app/environment';
	import { PUBLIC_PROXY_URL } from '$env/static/public';
	import VideoPlayerError, {
		type ShakaErrorDetail
	} from '$lib/components/video/VideoPlayerError.svelte';
	import type { VideoPlayerConfig } from '$lib/adapters/player';
	import type {
		ShakaPlayerInstance,
		ShakaRequest,
		ShakaUIConfiguration,
		ShakaUIOverlayInstance,
		ShakaVariantChangedEvent
	} from '$lib/player/shaka';
	import {
		DEFAULT_PREFERENCES,
		loadPreferences,
		savePreferences,
		type PlayerPreferences
	} from '$lib/player/preferences';
	import { buildPlayerConfig } from '$lib/player/config';

	let { config }: { config: VideoPlayerConfig } = $props();

	let videoElement: HTMLVideoElement = $state(null!);
	let videoContainer: HTMLDivElement = $state(null!);
	let player: ShakaPlayerInstance | null = null;
	let ui: ShakaUIOverlayInstance | null = null;

	let playerReady = $state(false);

	let loadedUrl: string | null = null;

	let preferences: PlayerPreferences = { ...DEFAULT_PREFERENCES };

	let applyingPreferences = false;

	let playerError = $state<ShakaErrorDetail | null>(null);
	let retrying = $state(false);

	const PROXY_URL = PUBLIC_PROXY_URL || '/proxy';

	function setShakaControlsVisible(visible: boolean) {
		if (!videoContainer) return;
		const controls = videoContainer.querySelector(
			'.shaka-controls-container'
		) as HTMLElement | null;
		if (controls) {
			controls.style.visibility = visible ? '' : 'hidden';
			controls.style.pointerEvents = visible ? '' : 'none';
		}
	}

	/**
	 * Load or reload the manifest into an already-attached player.
	 * Called on first mount and on retry.
	 */
	async function loadManifest() {
		if (!player) return;

		if (!config.manifestUrl) {
			console.error('Manifest URL is empty or undefined');
			playerError = { category: 4, code: 0, severity: 2 };
			await tick();
			setShakaControlsVisible(false);
			return;
		}

		const url = config.manifestUrl;
		const mimeType: string = config.isMuxed ? 'video/mp4' : 'application/dash+xml';

		loadedUrl = url;
		applyingPreferences = true;

		try {
			if (!config.isMuxed) {
				player.configure(buildPlayerConfig(preferences));
			}

			await player.load(url, null, mimeType);

			if (!config.isMuxed && preferences.textLanguage) {
				await player.setTextTrackVisibility(true);
			}
			playerError = null;
			await tick();
			setShakaControlsVisible(true);
		} catch (err) {
			console.error('Error loading video player manifest:', err);
			const shakaErr = err as { category?: unknown; code?: number; severity?: number };
			if (typeof shakaErr?.category === 'number') {
				playerError = {
					category: shakaErr.category,
					code: shakaErr.code ?? 0,
					severity: shakaErr.severity ?? 2
				};
			} else {
				playerError = { category: 4, code: 0, severity: 2 };
			}
			await tick();
			setShakaControlsVisible(false);
		}
	}

	$effect(() => {
		const url = config.manifestUrl;
		if (!playerReady || !url || url === loadedUrl) return;
		void loadManifest();
	});

	/**
	 * Shaka event error handler
	 */
	function handleShakaErrorEvent(event: Event) {
		const detail = (event as CustomEvent)?.detail;
		if (!detail) return;

		const { category, code, severity } = detail;

		console.error(
			`Shaka error — category: ${category}, code: ${code}, severity: ${severity}`,
			detail
		);

		playerError = { category, code, severity };
	}

	function handleVariantChanged(event: Event) {
		if (applyingPreferences) return;

		const { oldTrack, newTrack } = event as ShakaVariantChangedEvent;
		if (!newTrack) return;

		const audioChanged =
			oldTrack?.language !== newTrack.language || oldTrack?.primary !== newTrack.primary;
		if (!audioChanged) return;

		preferences = savePreferences({ audioLanguage: newTrack.primary ? '' : newTrack.language });
	}

	function handleTextSelectionChanged() {
		if (applyingPreferences || !player) return;

		if (!player.isTextTrackVisible()) {
			preferences = savePreferences({ textLanguage: '' });
			return;
		}

		const active = player.getTextTracks().find((track) => track.active);
		if (active?.language) {
			preferences = savePreferences({ textLanguage: active.language });
		}
	}

	async function handleRetry() {
		if (retrying) return;
		retrying = true;
		playerError = null;

		await tick();
		setShakaControlsVisible(false);

		loadedUrl = null;
		await loadManifest();
		retrying = false;
	}

	let destroyed = false;

	onMount(async () => {
		if (!browser) return;

		preferences = loadPreferences();

		// Dynamically import Shaka Player only in the browser (no SSR)
		const shakaModule = await import('shaka-player/dist/shaka-player.ui');
		await import('shaka-player/dist/controls.css');
		const shaka = shakaModule.default;

		if (destroyed || !videoElement) return;

		shaka.polyfill.installAll();

		if (!shaka.Player.isBrowserSupported()) {
			console.error('Browser not supported!');
			playerError = { category: 7, code: 0, severity: 2 };
			return;
		}

		try {
			player = new shaka.Player();

			await player.attach(videoElement);

			if (destroyed) return;

			ui = new shaka.ui.Overlay(player, videoContainer, videoElement);

			const config_ui: ShakaUIConfiguration = {
				addSeekBar: true,
				bigButtons: ['play_pause_buffering'],
				controlPanelElements: [
					'play_pause',
					'time_and_duration',
					'mute',
					'volume',
					'spacer',
					'quality',
					'language',
					'captions',
					'overflow_menu',
					'fullscreen'
				],
				showBufferingSpinner: false,
				trackLabelFormat: shaka.ui.Overlay.TrackLabelFormat.LABEL,
				textTrackLabelFormat: shaka.ui.Overlay.TrackLabelFormat.LABEL,
				showAudioCodec: false
			};

			ui.configure(config_ui);

			player.addEventListener('error', handleShakaErrorEvent);
			player.addEventListener('variantchanged', handleVariantChanged);
			player.addEventListener('textchanged', handleTextSelectionChanged);
			player.addEventListener('texttrackvisibility', handleTextSelectionChanged);

			// Request filter to proxy googlevideo.com URLs
			const networkingEngine = player.getNetworkingEngine();
			if (networkingEngine) {
				networkingEngine.registerRequestFilter((type: number, request: ShakaRequest) => {
					// Type 1 = SEGMENT, Type 2 = MANIFEST (also covers direct MP4 initial fetch)
					const originalUrl = new URL(request.uris[0]);

					if (originalUrl.host.endsWith('.googlevideo.com')) {
						originalUrl.searchParams.set('host', originalUrl.host);

						// Parse proxy URL
						const proxyBase = PROXY_URL.startsWith('/')
							? `${window.location.origin}${PROXY_URL}`
							: PROXY_URL;

						// Build the new proxied URL
						const proxyUrl = new SvelteURL(proxyBase);
						proxyUrl.pathname = new SvelteURL(proxyBase).pathname + originalUrl.pathname;
						proxyUrl.search = originalUrl.search;

						// Handle Range header conversion to query parameter
						if (request.headers.Range) {
							const rangeValue = request.headers.Range.split('=')[1];
							proxyUrl.searchParams.set('range', rangeValue);
							request.headers = {};
						}

						request.uris[0] = proxyUrl.toString();
					}
				});
			}

			await loadManifest();
			playerReady = true;
		} catch (error) {
			console.error('Error initializing video player:', error);
			playerError = { category: 7, code: 0, severity: 2 };
			await tick();
			setShakaControlsVisible(false);
		} finally {
			applyingPreferences = false;
		}
	});

	onDestroy(() => {
		destroyed = true;
		playerReady = false;

		const localUi = ui;
		const localPlayer = player;
		ui = null;
		player = null;

		void (async () => {
			try {
				if (localUi) {
					await localUi.destroy();
				} else if (localPlayer) {
					await localPlayer.destroy();
				}
			} catch (err) {
				console.error('Error destroying video player:', err);
			}
		})();
	});
</script>

<div bind:this={videoContainer} class="video-container">
	<video
		id="video"
		data-testid="video-player"
		bind:this={videoElement}
		class="video-player"
		poster={config.poster}
		playsinline
	>
		<track kind="captions" label="Captions" />
	</video>

	{#if playerError && !retrying}
		<div class="error-overlay">
			<VideoPlayerError error={playerError} onRetry={handleRetry} {retrying} />
		</div>
	{/if}
</div>

<style>
	.video-container {
		position: relative;
		width: 100%;
		max-width: 1280px;
		margin: 0 auto;
		background: black;
	}

	.video-player {
		width: 100%;
		height: auto;
	}

	.error-overlay {
		position: absolute;
		inset: 0;
		z-index: 10;
	}

	:global(.shaka-overflow-menu) {
		background: rgba(35, 35, 35, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
</style>
