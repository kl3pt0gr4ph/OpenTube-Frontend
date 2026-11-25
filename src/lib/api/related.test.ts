/**
 * Test Suite: related.ts
 *
 * Tests for related video streams fetching
 */

import { describeJsonFetcher } from '../../tests/helpers/describeJsonFetcher';
import relatedVideosFixture from '../../tests/fixtures/api/relatedVideosResponse.json';
import { getRelatedStreams } from '#lib/api/related.js';
import { describe, it, expect, vi } from 'vitest';
import { createInvalidJsonBodyFetch, createSuccessfulFetch } from '../../tests/helpers/apiHelpers';

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
		['null body', () => createSuccessfulFetch(null)],
		['object without streams', () => createSuccessfulFetch({})],
		['streams is not an array', () => createSuccessfulFetch({ streams: 'nope' })],
		['a body that is not JSON', () => createInvalidJsonBodyFetch()]
	])('rejects with INVALID_RESPONSE for %s', async (_label, createFetch) => {
		await expect(getRelatedStreams('id1', createFetch() as never)).rejects.toMatchObject({
			errorCode: 'INVALID_RESPONSE',
			message: 'Unexpected response format for related streams'
		});
	});
});
