/**
 * Test Suite: comments.ts
 *
 * Tests for video comments fetching including parsing,
 * error handling, and data validation
 */

import { describeJsonFetcher } from '../../tests/helpers/describeJsonFetcher';
import commentFixture from '../../tests/fixtures/api/commentsResponse.json';
import { getVideoComments } from '#lib/api/comments.js';

describeJsonFetcher({
	name: 'getComments',
	call: getVideoComments,
	endpoint: '/comments',
	fixture: commentFixture[0]
});
