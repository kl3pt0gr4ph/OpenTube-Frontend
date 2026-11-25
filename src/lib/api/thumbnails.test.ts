import { describeJsonFetcher } from '../../tests/helpers/describeJsonFetcher';
import thumbnailFixture from '../../tests/fixtures/api/thumbnailsResponseFixture.json';
import { getVideoThumbnails } from '#lib/api/thumbnails.js';
import { describe, it, expect, vi } from 'vitest';
import { createInvalidJsonBodyFetch, createSuccessfulFetch } from '../../tests/helpers/apiHelpers';

describeJsonFetcher({
	name: 'getVideoThumbnails',
	call: getVideoThumbnails,
	endpoint: '/streams/thumbnails',
	fixture: thumbnailFixture,
	expected: thumbnailFixture[4]
});

describe('getVideoThumbnails selection', () => {
	it('falls back to the last thumbnail when no HIGH exists', async () => {
		const noHigh = thumbnailFixture.slice(0, -1);
		const fetchFn = createSuccessfulFetch(noHigh);
		await expect(getVideoThumbnails('id1', fetchFn as never)).resolves.toEqual(
			noHigh[noHigh.length - 1]
		);
	});

	it.each([
		['an empty array', () => createSuccessfulFetch([])],
		['a body that is not an array', () => createSuccessfulFetch({ thumbnails: [] })],
		['a body that is not JSON', () => createInvalidJsonBodyFetch()]
	])('rejects with INVALID_RESPONSE for %s', async (_label, createFetch) => {
		await expect(getVideoThumbnails('id1', createFetch() as never)).rejects.toMatchObject({
			errorCode: 'INVALID_RESPONSE',
			message: 'No thumbnails available for video id1'
		});
	});
});
