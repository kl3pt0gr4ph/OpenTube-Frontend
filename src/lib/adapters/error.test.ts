import { describe, it, expect } from 'vitest';
import { ApiError } from '#lib/api/errors.ts';
import { adaptError, GENERIC_ERROR } from '#lib/adapters/error.ts';

const apiError = (errorCode: string, status: number = 500): ApiError =>
	new ApiError({ status, errorCode, message: 'Message from the API.' });

describe('adaptError', () => {
	it('picks the copy by errorCode, worded for what failed to load', () => {
		expect(adaptError(apiError('CONTENT_PRIVATE', 403), 'channel')).toEqual({
			errorCode: 'CONTENT_PRIVATE',
			variant: 'info',
			title: 'Private channel',
			message: 'This channel is private.',
			retryable: false
		});
	});

	it('branches on errorCode, not status', () => {
		expect(adaptError(apiError('UPSTREAM_BLOCKED', 500))).toMatchObject({
			title: 'YouTube is blocking this server',
			retryable: true
		});
		expect(adaptError(apiError('SOMETHING_NEW', 403))).toMatchObject(GENERIC_ERROR);
	});

	it.each([
		['a code the frontend has never heard of', apiError('SOMETHING_NEW'), 'SOMETHING_NEW'],
		['a code with no copy of its own', apiError('EXTRACTION_ERROR'), 'EXTRACTION_ERROR'],
		['a code named like an Object property', apiError('constructor'), 'constructor'],
		['an error that is not an ApiError', new TypeError('x is undefined'), 'UNKNOWN_ERROR'],
		['a thrown non-Error', 'oops', 'UNKNOWN_ERROR']
	])('gives the generic card for %s', (_label, error, errorCode) => {
		expect(adaptError(error, 'video')).toEqual({ errorCode, ...GENERIC_ERROR });
	});
});
