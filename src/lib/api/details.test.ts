/**
 * Test Suite: details.ts
 *
 * Tests for video details fetching including metadata parsing,
 * error handling, and data validation
 */

import { describeJsonFetcher } from '../../tests/helpers/describeJsonFetcher';
import detailsFixture from '../../tests/fixtures/api/detailsResponseFixture.json';
import { getVideoDetails } from '#lib/api/details.js';

describeJsonFetcher({
	name: 'getVideoDetails',
	// call: getVideoDetails,
	call: (id, fetchFn) => getVideoDetails(id, fetchFn),
	endpoint: '/streams/details',
	fixture: detailsFixture[0]
});
