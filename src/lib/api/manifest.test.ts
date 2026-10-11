/**
 * Test Suite: manifest.ts
 *
 * Tests for DASH manifest fetching including XML parsing, duration extraction,
 * blob URL generation, the muxed-progressive fallback, error handling, and
 * backward compatibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getManifest, getManifestUrl } from './manifest';
import {
	createSuccessfulFetch,
	createFailedFetch,
	createNetworkErrorFetch
} from '../../tests/helpers/apiHelpers';
import manifestXmlFixture from '../../tests/fixtures/api/manifestXmlFixture.xml?raw';

const DIRECT_URL = 'https://rr3---sn-test.googlevideo.com/videoplayback?id=123';

const createMockManifestXml = (duration: string = 'PT2M56S'): string =>
	manifestXmlFixture
		.replace('STANDARD_DURATION', `duration="${duration}"`)
		.replace('MEDIA_PRESENTATION_DURATION', `mediaPresentationDuration="${duration}"`);

const createManifestXmlWithoutDuration = (): string =>
	manifestXmlFixture.replace('STANDARD_DURATION', '').replace('MEDIA_PRESENTATION_DURATION', '');

/** A /dash response carrying a direct URL instead of a manifest. */
const createMuxedFetch = (body: string, headers: Record<string, string>) =>
	vi.fn().mockResolvedValue({
		ok: true,
		status: 200,
		statusText: 'OK',
		headers: new Headers(headers),
		text: vi.fn().mockResolvedValue(body)
	}) as unknown as typeof globalThis.fetch;

const URI_LIST = { 'Content-Type': 'text/uri-list;charset=UTF-8' };

beforeEach(() => {
	global.URL.createObjectURL = vi.fn(() => `blob:http://localhost/${Math.random()}`);
	global.URL.revokeObjectURL = vi.fn();
});

describe('getManifest', () => {
	it('returns a blob URL, parsed duration, and video id for a DASH manifest', async () => {
		const mockFetch = createSuccessfulFetch(createMockManifestXml('PT2M56S'), { format: 'xml' });
		vi.spyOn(console, 'log').mockImplementation(() => {});

		const result = await getManifest('video-id', mockFetch as never);

		expect(result.url).toMatch(/^blob:/);
		expect(result.duration).toBe(176);
		expect(result.videoId).toBe('0'); // AdaptationSet id in the fixture
		expect(result.isMuxed).toBeUndefined();

		// blob created once, with the DASH mime type
		const createObjectURL = vi.mocked(URL.createObjectURL);
		expect(createObjectURL).toHaveBeenCalledTimes(1);
		expect((createObjectURL.mock.calls[0][0] as Blob).type).toBe('application/dash+xml');
	});

	it('parses a millisecond-precision duration', async () => {
		// The API now sends the real media length, e.g. PT1M59.702S
		const mockFetch = createSuccessfulFetch(createMockManifestXml('PT1M59.702S'), {
			format: 'xml'
		});
		vi.spyOn(console, 'log').mockImplementation(() => {});

		const result = await getManifest('video-id', mockFetch as never);

		expect(result.duration).toBeCloseTo(119.702, 3);
	});

	describe('muxed-progressive fallback', () => {
		it.each([
			['URL with the trailing CRLF the API sends', `${DIRECT_URL}\r\n`],
			['bare URL', DIRECT_URL],
			['URL after a comment line', `# muxed fallback\r\n${DIRECT_URL}\r\n`]
		])('returns the trimmed direct URL for a text/uri-list %s', async (_name, body) => {
			vi.spyOn(console, 'log').mockImplementation(() => {});

			const result = await getManifest('video-id', createMuxedFetch(body, URI_LIST));

			expect(result).toEqual({ url: DIRECT_URL, duration: 0, isMuxed: true });
			expect(URL.createObjectURL).not.toHaveBeenCalled();
		});

		it('still recognises the legacy X-Stream-Type header', async () => {
			vi.spyOn(console, 'log').mockImplementation(() => {});

			const result = await getManifest(
				'video-id',
				createMuxedFetch(DIRECT_URL, { 'X-Stream-Type': 'muxed-progressive' })
			);

			expect(result).toEqual({ url: DIRECT_URL, duration: 0, isMuxed: true });
		});

		it('throws when the fallback body contains no URL', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => {});

			await expect(
				getManifest('video-id', createMuxedFetch('\r\n# nothing here\r\n', URI_LIST))
			).rejects.toThrow(/video-id[\s\S]*no URL/);
		});
	});

	it('defaults duration to 0 when mediaPresentationDuration is absent', async () => {
		const mockFetch = createSuccessfulFetch(createManifestXmlWithoutDuration(), { format: 'xml' });
		vi.spyOn(console, 'log').mockImplementation(() => {});

		const result = await getManifest('video-id', mockFetch as never);

		expect(result.duration).toBe(0);
		expect(result.url).toMatch(/^blob:/);
	});

	it('uses global fetch when none is injected', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		global.fetch = createSuccessfulFetch(createMockManifestXml(), { format: 'xml' }) as never;

		const result = await getManifest('video-id');

		expect(result.url).toMatch(/^blob:/);
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it.each([
		[404, 'Not Found'],
		[503, 'Service Unavailable']
	])('throws with id, status and statusText on HTTP %i', async (status, statusText) => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const mockFetch = createFailedFetch(status, statusText);

		await expect(getManifest('bad-id', mockFetch)).rejects.toThrow(
			new RegExp(`bad-id[\\s\\S]*${status}[\\s\\S]*${statusText}`)
		);
	});

	it('propagates network errors', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(
			getManifest('video-id', createNetworkErrorFetch('Failed to fetch'))
		).rejects.toThrow('Failed to fetch');
	});
});

describe('getManifestUrl (legacy wrapper)', () => {
	it('delegates to getManifest and returns just the URL', async () => {
		const mockFetch = createSuccessfulFetch(createMockManifestXml(), { format: 'xml' });
		vi.spyOn(console, 'log').mockImplementation(() => {});

		const url = await getManifestUrl('video-id', mockFetch as never);

		expect(url).toMatch(/^blob:/);
	});
});
