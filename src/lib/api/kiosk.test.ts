/**
 * Test Suite: kiosk.ts
 *
 * Tests for kiosk fetching
 */

import { describeJsonFetcher } from '../../tests/helpers/describeJsonFetcher';
import kioskInfoResponseFixture from '../../tests/fixtures/api/kioskVideosApiResponse.json';
import { getKioskInfo } from '#lib/api/kiosk.js';
import { describe, it, expect, vi } from 'vitest';

describeJsonFetcher({
	name: 'getKioskInfo',
	call: getKioskInfo,
	endpoint: '/kiosks',
	idIn: 'path',
	fixture: kioskInfoResponseFixture
});

describe('getKioskInfo', () => {
	it('rejects with INVALID_RESPONSE for a malformed JSON body', async () => {
		const fetchFn = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			statusText: 'OK',
			json: async () => {
				throw new SyntaxError('Unexpected end of JSON input');
			}
		});

		await expect(
			getKioskInfo('trending_podcasts_episodes', fetchFn as never)
		).rejects.toMatchObject({ name: 'ApiError', status: 200, errorCode: 'INVALID_RESPONSE' });
	});
});
