import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, fireEvent } from '@testing-library/svelte';
import '@testing-library/jest-dom';
import { PREFERENCES_STORAGE_KEY, loadPreferences } from '$lib/player/preferences';

let mockRegisterRequestFilter = vi.fn();

const mockNetworkingEngine = {
	registerRequestFilter: mockRegisterRequestFilter
};

// Create mocks for Shaka Player
const mockPlayerInstance = {
	attach: vi.fn().mockResolvedValue(undefined),
	load: vi.fn().mockResolvedValue(undefined),
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	configure: vi.fn((_config: object) => true),
	setTextTrackVisibility: vi.fn().mockResolvedValue(undefined),
	isTextTrackVisible: vi.fn(() => false),
	getTextTracks: vi.fn((): { active: boolean; language: string }[] => []),
	getNetworkingEngine: vi.fn(() => mockNetworkingEngine),
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	destroy: vi.fn().mockImplementation(() => Promise.resolve())
};

const mockUIInstance = {
	configure: vi.fn(),
	destroy: vi.fn(async () => {
		await mockPlayerInstance.destroy();
	}),
	getControls: vi.fn(() => ({}))
};

let capturedVideoElement: HTMLVideoElement | null = null;

class MockShakaPlayer {
	attach(videoEl: HTMLVideoElement) {
		capturedVideoElement = videoEl;
		// Forward the promise so rejection scenarios reach the component
		return mockPlayerInstance.attach(videoEl);
	}

	static isBrowserSupported = vi.fn(() => {
		return true;
	});

	load(manifestUrl: string, startTime?: number | null, mimeType?: string) {
		// Forward all arguments so the mime type used for muxed streams is observable
		return mockPlayerInstance.load(manifestUrl, startTime, mimeType);
	}

	configure(config: object) {
		return mockPlayerInstance.configure(config);
	}

	setTextTrackVisibility(visible: boolean) {
		return mockPlayerInstance.setTextTrackVisibility(visible);
	}

	isTextTrackVisible() {
		return mockPlayerInstance.isTextTrackVisible();
	}

	getTextTracks() {
		return mockPlayerInstance.getTextTracks();
	}

	getNetworkingEngine() {
		return mockPlayerInstance.getNetworkingEngine();
	}

	addEventListener = vi.fn((event: string, listener: (event: ShakaErrorEvent) => void) => {
		return mockPlayerInstance.addEventListener(event, listener);
	});

	removeEventListener = vi.fn((event: string, listener: (event: ShakaErrorEvent) => void) => {
		return mockPlayerInstance.removeEventListener(event, listener);
	});

	destroy = vi.fn(() => {
		return mockPlayerInstance.destroy();
	});
}

class MockShakaUIOverlay {
	static TrackLabelFormat = {
		LANGUAGE: 0,
		ROLE: 1,
		LANGUAGE_ROLE: 2,
		LABEL: 3,
		LABEL_OR_LANGUAGE: 4
	};

	configure(config: ShakaUIConfiguration) {
		mockUIInstance.configure(config);
	}

	destroy() {
		return mockUIInstance.destroy();
	}

	getControls = vi.fn(() => {
		return mockUIInstance.getControls();
	});
}

// Mock Shaka Player module
vi.mock('shaka-player/dist/shaka-player.ui', () => ({
	default: {
		Player: MockShakaPlayer,
		ui: {
			Overlay: MockShakaUIOverlay
		},
		polyfill: {
			installAll: vi.fn()
		}
	}
}));

vi.mock('shaka-player/dist/controls.css', () => ({}));

import VideoPlayer from './VideoPlayer.svelte';
import type { VideoPlayerConfig } from '$lib/adapters/player';
import type { ShakaErrorEvent, ShakaUIConfiguration } from '$lib/player/shaka';

describe('VideoPlayer.svelte', () => {
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;

	const mockConfig: VideoPlayerConfig = {
		manifestUrl: 'blob:http://localhost:5173/test-manifest',
		duration: 180,
		poster: 'https://example.com/poster.jpg'
	};

	// Helper Functions
	const renderAndWaitForInit = async (config = mockConfig) => {
		const result = render(VideoPlayer, { config });
		await waitFor(
			() => {
				expect(mockPlayerInstance.load).toHaveBeenCalled();
			},
			{ timeout: 2000 }
		);
		return result;
	};

	const getRegisteredFilter = () => {
		expect(mockRegisterRequestFilter).toHaveBeenCalled();
		return mockRegisterRequestFilter.mock.calls[0][0];
	};

	/** The listener the component registered for a Shaka player event. */
	const getListener = (eventName: string) => {
		const call = mockPlayerInstance.addEventListener.mock.calls.find(([evt]) => evt === eventName);
		expect(call).toBeDefined();
		return call![1] as (event: unknown) => void;
	};

	const getErrorListener = () => getListener('error') as (event: { detail?: unknown }) => void;

	const createMockRequest = (url: string, headers = {}) => ({
		uris: [url],
		headers
	});

	const waitForErrorOverlay = (container: HTMLElement) =>
		waitFor(
			() => {
				expect(container.querySelector('.error-overlay')).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

	const storePreferences = (prefs: object) =>
		localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));

	const audioTrack = (language: string, primary: boolean, height = 1080) => ({
		language,
		primary,
		height
	});

	const SEGMENT_TYPE = 1;
	const MANIFEST_TYPE = 0;

	// Test Setup
	beforeEach(() => {
		vi.clearAllMocks();
		capturedVideoElement = null;
		localStorage.clear();

		mockRegisterRequestFilter = vi.fn();
		mockNetworkingEngine.registerRequestFilter = mockRegisterRequestFilter;

		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		// Reset to success state
		MockShakaPlayer.isBrowserSupported.mockClear();
		MockShakaPlayer.isBrowserSupported.mockImplementation(() => {
			return true;
		});
		mockPlayerInstance.attach.mockResolvedValue(undefined);
		mockPlayerInstance.load.mockResolvedValue(undefined);
		mockPlayerInstance.configure.mockReturnValue(true);
		mockPlayerInstance.setTextTrackVisibility.mockResolvedValue(undefined);
		mockPlayerInstance.isTextTrackVisible.mockReturnValue(false);
		mockPlayerInstance.getTextTracks.mockReturnValue([]);
		mockPlayerInstance.destroy.mockImplementation(() => Promise.resolve());
		mockPlayerInstance.getNetworkingEngine.mockReturnValue(mockNetworkingEngine);
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
		consoleLogSpy.mockRestore();
	});

	// Tests
	describe('Component rendering', () => {
		it('should render video element with poster and required attributes', async () => {
			const { container } = render(VideoPlayer, { config: mockConfig });
			const video = container.querySelector('video');
			expect(video).toBeInTheDocument();
			expect(video).toHaveAttribute('poster', mockConfig.poster);
			expect(video).toHaveAttribute('playsinline');

			// let init settle so no pending import straddles the test boundary
			await waitFor(() => expect(mockPlayerInstance.attach).toHaveBeenCalled());
		});
	});

	describe('Player initialisation', () => {
		it('should fully initialise player with all components and configurations', async () => {
			render(VideoPlayer, { config: mockConfig });

			await waitFor(
				() => {
					// Browser support and attachment
					expect(MockShakaPlayer.isBrowserSupported).toHaveBeenCalled();
					expect(mockPlayerInstance.attach).toHaveBeenCalled();
					expect(capturedVideoElement).not.toBeNull();
					expect(capturedVideoElement).toBeInstanceOf(HTMLVideoElement);
					expect(capturedVideoElement?.dataset.testid).toBe('video-player');

					// UI overlay configuration
					expect(mockUIInstance.configure).toHaveBeenCalled();
					const uiConfig = mockUIInstance.configure.mock.calls[0][0];

					expect(uiConfig.addSeekBar).toBe(true);

					const expectedBigButtons = ['play_pause_buffering'];

					expectedBigButtons.forEach(button => {
						expect(uiConfig.bigButtons).toContain(button);
					})

					expect(uiConfig.showBufferingSpinner).toBe(false);

					// Control panel elements
					const expectedControls = [
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
					];
					expectedControls.forEach((control) => {
						expect(uiConfig.controlPanelElements).toContain(control);
					});

					// Manifest and event listener
					expect(mockPlayerInstance.load).toHaveBeenCalledWith(
						mockConfig.manifestUrl,
						null,
						'application/dash+xml'
					);
					expect(mockPlayerInstance.addEventListener).toHaveBeenCalledWith(
						'error',
						expect.any(Function)
					);

					// Verify initialization order
					const browserSupportOrder =
						MockShakaPlayer.isBrowserSupported.mock.invocationCallOrder[0];
					const attachOrder = mockPlayerInstance.attach.mock.invocationCallOrder[0];
					const uiConfigureOrder = mockUIInstance.configure.mock.invocationCallOrder[0];
					const loadOrder = mockPlayerInstance.load.mock.invocationCallOrder[0];

					expect(browserSupportOrder).toBeLessThan(attachOrder);
					expect(attachOrder).toBeLessThan(uiConfigureOrder);
					expect(uiConfigureOrder).toBeLessThan(loadOrder);
				},
				{ timeout: 2000 }
			);
		});

		it('labels tracks from the manifest Label and merges codec variants', async () => {
			await renderAndWaitForInit();

			const uiConfig = mockUIInstance.configure.mock.calls[0][0];
			expect(uiConfig.trackLabelFormat).toBe(MockShakaUIOverlay.TrackLabelFormat.LABEL);
			expect(uiConfig.textTrackLabelFormat).toBe(MockShakaUIOverlay.TrackLabelFormat.LABEL);
			expect(uiConfig.showAudioCodec).toBe(false);
		});

		it('aborts initialization when unmounted before the Shaka import resolves', async () => {
			const { unmount } = render(VideoPlayer, { config: mockConfig });
			unmount(); // navigation-away race: init still awaiting the dynamic import

			// let the pending import + guard settle
			await new Promise((r) => setTimeout(r, 0));
			await new Promise((r) => setTimeout(r, 0));

			expect(mockPlayerInstance.attach).not.toHaveBeenCalled();
			expect(consoleErrorSpy).not.toHaveBeenCalled();
		});
	});

	describe('Manifest loading', () => {
		it('should load manifest URL with DASH mime type', async () => {
			await renderAndWaitForInit();
			expect(mockPlayerInstance.load).toHaveBeenCalledWith(
				mockConfig.manifestUrl,
				null,
				'application/dash+xml'
			);
		});

		it('should show the error overlay for an empty manifest URL', async () => {
			const invalidConfig = { ...mockConfig, manifestUrl: '' };
			const { container } = render(VideoPlayer, { config: invalidConfig });
			await waitForErrorOverlay(container);
		});

		it('should show the error overlay when the manifest load fails', async () => {
			mockPlayerInstance.load.mockRejectedValueOnce(new Error('Load failed'));
			const { container } = render(VideoPlayer, { config: mockConfig });
			await waitForErrorOverlay(container);
		});

		it('should extract category/code from shaka-shaped load errors', async () => {
			// covers the typeof shakaErr?.category === 'number' branch;
			// the plain-Error test above covers the generic fallback branch
			mockPlayerInstance.load.mockRejectedValueOnce({ category: 3, code: 1001 });
			const { container } = render(VideoPlayer, { config: mockConfig });
			await waitForErrorOverlay(container);
		});

		it('explains when the browser cannot play any variant', async () => {
			mockPlayerInstance.load.mockRejectedValueOnce({ category: 4, code: 4032, severity: 2 });
			const { container, findByText } = render(VideoPlayer, { config: mockConfig });

			await waitForErrorOverlay(container);
			expect(await findByText('Format Not Supported')).toBeInTheDocument();
		});
	});

	describe('Playback preferences', () => {
		it('configures ABR and the original audio track before loading', async () => {
			await renderAndWaitForInit();

			expect(mockPlayerInstance.configure).toHaveBeenCalledTimes(1);
			const config = mockPlayerInstance.configure.mock.calls[0][0] as {
				abr: { enabled: boolean; restrictToElementSize: boolean };
				preferredAudio: { language: string; role: string }[];
				preferredText: unknown[];
			};
			expect(config.abr.enabled).toBe(true);
			expect(config.abr.restrictToElementSize).toBe(true);
			expect(config.preferredAudio.at(-1)).toMatchObject({ language: '', role: 'main' });
			expect(config.preferredText).toEqual([]);

			expect(mockPlayerInstance.configure.mock.invocationCallOrder[0]).toBeLessThan(
				mockPlayerInstance.load.mock.invocationCallOrder[0]
			);
		});

		it('reapplies the configuration on every load, resetting a manual quality to Auto', async () => {
			const { container, getByRole } = await renderAndWaitForInit();
			getErrorListener()({ detail: { category: 1, code: 1002, severity: 2 } });
			await waitForErrorOverlay(container);

			await fireEvent.click(getByRole('button', { name: /retry/i }));

			await waitFor(() => {
				expect(mockPlayerInstance.configure).toHaveBeenCalledTimes(2);
				expect(mockPlayerInstance.configure.mock.calls[1][0]).toMatchObject({
					abr: { enabled: true }
				});
			});
		});

		it('reloads in place on navigation, reapplying the configuration', async () => {
			const nextUrl = 'blob:http://localhost:5173/next-video';
			const { rerender } = await renderAndWaitForInit();

			await rerender({ config: { ...mockConfig, manifestUrl: nextUrl } });

			await waitFor(() => {
				expect(mockPlayerInstance.load).toHaveBeenLastCalledWith(
					nextUrl,
					null,
					'application/dash+xml'
				);
				expect(mockPlayerInstance.configure).toHaveBeenCalledTimes(2);
			});
		});

		it('applies stored audio and subtitle languages', async () => {
			storePreferences({ audioLanguage: 'de', textLanguage: 'en' });

			await renderAndWaitForInit();

			const config = mockPlayerInstance.configure.mock.calls[0][0] as {
				preferredAudio: { language: string }[];
				preferredText: { language: string }[];
			};
			expect(config.preferredAudio[0].language).toBe('de');
			expect(config.preferredText[0].language).toBe('en');
			await waitFor(() =>
				expect(mockPlayerInstance.setTextTrackVisibility).toHaveBeenCalledWith(true)
			);
		});

		it('leaves subtitles off when no subtitle language is stored', async () => {
			await renderAndWaitForInit();

			expect(mockPlayerInstance.setTextTrackVisibility).not.toHaveBeenCalled();
		});

		it('does not configure DASH preferences for a muxed stream', async () => {
			await renderAndWaitForInit({
				...mockConfig,
				manifestUrl: 'https://example.com/direct-stream.mp4',
				isMuxed: true
			});

			expect(mockPlayerInstance.configure).not.toHaveBeenCalled();
		});

		describe('remembering audio choices', () => {
			it('stores the language when the viewer switches to a dub', async () => {
				await renderAndWaitForInit();

				getListener('variantchanged')({
					oldTrack: audioTrack('en', true),
					newTrack: audioTrack('de', false)
				});

				expect(loadPreferences().audioLanguage).toBe('de');
			});

			it('clears the language when the viewer switches back to the original', async () => {
				storePreferences({ audioLanguage: 'de' });
				await renderAndWaitForInit();

				getListener('variantchanged')({
					oldTrack: audioTrack('de', false),
					newTrack: audioTrack('en', true)
				});

				expect(loadPreferences().audioLanguage).toBe('');
			});

			it('ignores a quality-only change', async () => {
				await renderAndWaitForInit();

				getListener('variantchanged')({
					oldTrack: audioTrack('en', true, 1080),
					newTrack: audioTrack('en', true, 720)
				});

				expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).toBeNull();
			});
		});

		describe('remembering subtitle choices', () => {
			it.each(['textchanged', 'texttrackvisibility'])(
				'stores the active subtitle language on %s',
				async (eventName) => {
					await renderAndWaitForInit();
					mockPlayerInstance.isTextTrackVisible.mockReturnValue(true);
					mockPlayerInstance.getTextTracks.mockReturnValue([
						{ active: false, language: 'fr' },
						{ active: true, language: 'en' }
					]);

					getListener(eventName)({});

					expect(loadPreferences().textLanguage).toBe('en');
				}
			);

			it('clears the subtitle language when subtitles are turned off', async () => {
				storePreferences({ textLanguage: 'en' });
				await renderAndWaitForInit();
				mockPlayerInstance.isTextTrackVisible.mockReturnValue(false);

				getListener('texttrackvisibility')({});

				expect(loadPreferences().textLanguage).toBe('');
			});

			it('keeps the stored language when this video has no matching track', async () => {
				storePreferences({ textLanguage: 'ja' });
				await renderAndWaitForInit();
				mockPlayerInstance.isTextTrackVisible.mockReturnValue(true);
				mockPlayerInstance.getTextTracks.mockReturnValue([{ active: false, language: 'en' }]);

				getListener('textchanged')({});

				expect(loadPreferences().textLanguage).toBe('ja');
			});

			it('ignores events caused by its own load', async () => {
				storePreferences({ textLanguage: 'en' });
				// Fire the visibility event while setTextTrackVisibility is still in progress
				mockPlayerInstance.setTextTrackVisibility.mockImplementation(async () => {
					mockPlayerInstance.isTextTrackVisible.mockReturnValue(false);
					getListener('texttrackvisibility')({});
				});

				await renderAndWaitForInit();
				await waitFor(() => expect(mockPlayerInstance.setTextTrackVisibility).toHaveBeenCalled());

				expect(loadPreferences().textLanguage).toBe('en');
			});
		});
	});

	describe('Runtime error handling and retry', () => {
		it('shows the error overlay when Shaka emits an error event', async () => {
			const { container } = await renderAndWaitForInit();
			const onShakaError = getErrorListener();

			onShakaError({ detail: { category: 1, code: 1002, severity: 2 } });

			await waitForErrorOverlay(container);
		});

		it('ignores error events without a detail payload', async () => {
			const { container } = await renderAndWaitForInit();
			const onShakaError = getErrorListener();

			onShakaError({});

			// guard branch: no detail, no state change, no overlay
			expect(container.querySelector('.error-overlay')).not.toBeInTheDocument();
		});

		it('retry reloads the manifest and clears the error overlay on success', async () => {
			const { container, getByRole } = await renderAndWaitForInit();
			getErrorListener()({ detail: { category: 1, code: 1002, severity: 2 } });
			await waitForErrorOverlay(container);
			expect(mockPlayerInstance.load).toHaveBeenCalledTimes(1);

			await fireEvent.click(getByRole('button', { name: /retry/i }));

			await waitFor(() => {
				expect(mockPlayerInstance.load).toHaveBeenCalledTimes(2);
				expect(container.querySelector('.error-overlay')).not.toBeInTheDocument();
			});
		});

		it('shows the overlay again when a retry fails', async () => {
			const { container, getByRole } = await renderAndWaitForInit();
			getErrorListener()({ detail: { category: 1, code: 1002, severity: 2 } });
			await waitForErrorOverlay(container);

			mockPlayerInstance.load.mockRejectedValueOnce({ category: 4, code: 1003, severity: 2 });
			await fireEvent.click(getByRole('button', { name: /retry|try again/i }));

			await waitFor(() => {
				expect(mockPlayerInstance.load).toHaveBeenCalledTimes(2);
				expect(container.querySelector('.error-overlay')).toBeInTheDocument();
			});
		});

		it('shows the error overlay when player initialisation fails', async () => {
			mockPlayerInstance.attach.mockRejectedValueOnce(new Error('attach failed'));
			const { container } = render(VideoPlayer, { config: mockConfig });

			await waitFor(() => {
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					'Error initializing video player:',
					expect.any(Error)
				);
				expect(container.querySelector('.error-overlay')).toBeInTheDocument();
			});
		});

		it('hides shaka controls while the error overlay is shown', async () => {
			const { container } = render(VideoPlayer, { config: { ...mockConfig, manifestUrl: '' } });

			const fakeControls = document.createElement('div');
			fakeControls.className = 'shaka-controls-container';
			container.querySelector('.video-container')!.appendChild(fakeControls);

			await waitForErrorOverlay(container);
			await waitFor(() => expect(fakeControls.style.visibility).toBe('hidden'));
		});
	});

	describe('Error handling', () => {
		it('should handle unsupported browser', async () => {
			MockShakaPlayer.isBrowserSupported = vi.fn(() => false);
			render(VideoPlayer, { config: mockConfig });

			await waitFor(
				() => {
					expect(consoleErrorSpy).toHaveBeenCalledWith(
						expect.stringContaining('Browser not supported')
					);
				},
				{ timeout: 2000 }
			);
		});
	});

	describe('Component cleanup', () => {
		it('should destroy player on unmount', async () => {
			const { unmount } = await renderAndWaitForInit();
			unmount();

			// Give it time to cleanup
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(mockUIInstance.destroy).toHaveBeenCalled();
			expect(mockPlayerInstance.destroy).toHaveBeenCalled();
		});
	});

	describe('Configuration variations', () => {
		it('should handle different manifest URLs', async () => {
			const config = { ...mockConfig, manifestUrl: 'blob:http://localhost:5173/other' };
			await renderAndWaitForInit(config);
			expect(mockPlayerInstance.load).toHaveBeenCalledWith(
				'blob:http://localhost:5173/other',
				null,
				'application/dash+xml'
			);
		});

		it('should load muxed streams with video/mp4 mime type', async () => {
			const config = {
				...mockConfig,
				manifestUrl: 'https://example.com/direct-stream.mp4',
				isMuxed: true
			};
			await renderAndWaitForInit(config);
			expect(mockPlayerInstance.load).toHaveBeenCalledWith(
				'https://example.com/direct-stream.mp4',
				null,
				'video/mp4'
			);
		});

		it('should handle empty poster', async () => {
			const config = { ...mockConfig, poster: '' };
			const { container } = render(VideoPlayer, { config });
			expect(container.querySelector('video')).toHaveAttribute('poster', '');
			await waitFor(() => expect(mockPlayerInstance.attach).toHaveBeenCalled());
		});

		it('should handle zero duration', async () => {
			const config = { ...mockConfig, duration: 0 };
			const { container } = render(VideoPlayer, { config });
			expect(container.querySelector('video')).toBeInTheDocument();
			await waitFor(() => expect(mockPlayerInstance.attach).toHaveBeenCalled());
		});
	});

	describe('Network request filtering', () => {
		it('should register request filter with networking engine', async () => {
			await renderAndWaitForInit();
			expect(mockPlayerInstance.getNetworkingEngine).toHaveBeenCalled();
			expect(mockRegisterRequestFilter).toHaveBeenCalledWith(expect.any(Function));
		});

		it('should proxy googlevideo.com segment requests through PROXY_URL', async () => {
			await renderAndWaitForInit();
			const filterFunction = getRegisteredFilter();

			const mockRequest = createMockRequest(
				'https://rr3---sn-25ge7nsk.googlevideo.com/videoplayback?id=123&key=value'
			);
			filterFunction(SEGMENT_TYPE, mockRequest);

			expect(mockRequest.uris[0]).toContain('http://localhost:8888');
			expect(mockRequest.uris[0]).toContain('host=rr3---sn-25ge7nsk.googlevideo.com');
			expect(mockRequest.uris[0]).toContain('id=123');
			expect(mockRequest.uris[0]).toContain('key=value');
		});

		it('should preserve original path and query parameters when proxying', async () => {
			await renderAndWaitForInit();
			const filterFunction = getRegisteredFilter();

			const mockRequest = createMockRequest(
				'https://rr3---sn-25ge7nsk.googlevideo.com/videoplayback?expire=1234&ei=abcd&ip=1.2.3.4'
			);
			filterFunction(SEGMENT_TYPE, mockRequest);

			const proxiedUrl = new URL(mockRequest.uris[0]);

			expect(proxiedUrl.pathname).toContain('/videoplayback');
			expect(proxiedUrl.searchParams.get('expire')).toBe('1234');
			expect(proxiedUrl.searchParams.get('ei')).toBe('abcd');
			expect(proxiedUrl.searchParams.get('ip')).toBe('1.2.3.4');
			expect(proxiedUrl.searchParams.get('host')).toBe('rr3---sn-25ge7nsk.googlevideo.com');
		});

		it('should convert Range header to query parameter', async () => {
			await renderAndWaitForInit();
			const filterFunction = getRegisteredFilter();

			const mockRequest = createMockRequest(
				'https://rr3---sn-25ge7nsk.googlevideo.com/videoplayback?id=123',
				{ Range: 'bytes=0-999999' }
			);
			filterFunction(SEGMENT_TYPE, mockRequest);

			const proxiedUrl = new URL(mockRequest.uris[0]);
			expect(proxiedUrl.searchParams.get('range')).toBe('0-999999');
			expect(mockRequest.headers).toEqual({});
		});

		it('should not modify non-googlevideo.com URLs', async () => {
			await renderAndWaitForInit();
			const filterFunction = getRegisteredFilter();

			const originalUrl = 'https://example.com/video.mp4?param=value';
			const mockRequest = createMockRequest(originalUrl);
			filterFunction(SEGMENT_TYPE, mockRequest);

			expect(mockRequest.uris[0]).toBe(originalUrl);
		});

		it('should proxy googlevideo.com requests for all request types', async () => {
			await renderAndWaitForInit();
			const filterFunction = getRegisteredFilter();

			const mockRequest = createMockRequest(
				'https://rr3---sn-25ge7nsk.googlevideo.com/videoplayback?id=123'
			);
			filterFunction(MANIFEST_TYPE, mockRequest);

			expect(mockRequest.uris[0]).toContain('http://localhost:8888');
			expect(mockRequest.uris[0]).toContain('host=rr3---sn-25ge7nsk.googlevideo.com');
			expect(mockRequest.uris[0]).toContain('id=123');
		});

		it('should handle networking engine being null', async () => {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-expect-error
			mockPlayerInstance.getNetworkingEngine.mockReturnValue(null);

			expect(() => {
				render(VideoPlayer, { config: mockConfig });
			}).not.toThrow();

			await waitFor(
				() => {
					expect(mockPlayerInstance.getNetworkingEngine).toHaveBeenCalled();
					expect(mockRegisterRequestFilter).not.toHaveBeenCalled();
				},
				{ timeout: 2000 }
			);
		});
	});
});
