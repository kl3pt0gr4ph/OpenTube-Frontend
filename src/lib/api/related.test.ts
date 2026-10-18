/**
 * Test Suite: related.ts
 *
 * Tests for related video streams fetching
 */

import { describeJsonFetcher } from '../../tests/helpers/describeJsonFetcher';
import relatedVideosFixture from '../../tests/fixtures/api/relatedVideosResponse.json';
import { getRelatedStreams } from '#lib/api/related.js';
import { describe, it, expect, vi } from 'vitest';
import { createSuccessfulFetch } from '../../tests/helpers/apiHelpers';

describeJsonFetcher({
	name: 'getRelatedStreams',
	call: getRelatedStreams,
	endpoint: '/streams/related',
	fixture: relatedVideosFixture
});

describe('getRelatedStreams response normalization', () => {
	it('unwraps the { streams: [...] } response format', async () => {
		const fetchFn = createSuccessfulFetch({ streams: relatedVideosFixture });
		await expect(getRelatedStreams('id1', fetchFn as never)).resolves.toEqual(relatedVideosFixture);
	});

	it.each([
		['null body', null],
		['object without streams', {}],
		['streams is not an array', { streams: 'nope' }]
	])('throws on unexpected format: %s', async (_label, body) => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const fetchFn = createSuccessfulFetch(body);
		await expect(getRelatedStreams('id1', fetchFn as never)).rejects.toThrow(
			'Unexpected response format for related streams'
		);
	});
});
