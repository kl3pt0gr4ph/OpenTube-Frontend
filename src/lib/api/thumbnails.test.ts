import { describeJsonFetcher } from '../../tests/helpers/describeJsonFetcher';
import thumbnailFixture from '../../tests/fixtures/api/thumbnailsResponseFixture.json';
import { getVideoThumbnails } from '#lib/api/thumbnails.js';
import { describe, it, expect, vi } from 'vitest';
import { createSuccessfulFetch } from '../../tests/helpers/apiHelpers';

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

	it('throws when the thumbnails array is empty', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const fetchFn = createSuccessfulFetch([]);
		await expect(getVideoThumbnails('id1', fetchFn as never)).rejects.toThrow(
			'No thumbnails available for video id1'
		);
	});
});
