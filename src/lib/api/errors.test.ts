import { describe, it, expect } from 'vitest';
import { ApiError, parseApiError, type ErrorResponse } from '#lib/api/errors.ts';

const errorBody = (overrides: Partial<ErrorResponse> = {}): ErrorResponse => ({
	timestamp: '2026-11-17T10:30:00.123Z',
	status: 403,
	error: 'Forbidden',
	message: 'This content is private.',
	errorCode: 'CONTENT_PRIVATE',
	path: '/api/v1/streams/details',
	...overrides
});

const json = (body: unknown, status: number): Response =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** What the /api forwarder sends when it can't get an answer from the backend. */
const forwarded = (status: number, code: string): Response =>
	new Response('Backend unreachable', {
		status,
		headers: { 'content-type': 'text/plain; charset=utf-8', 'x-api-error': code }
	});

describe('ApiError', () => {
	it('is an Error that carries the status and errorCode', () => {
		const error = new ApiError({ status: 451, errorCode: 'GEO_RESTRICTED', message: 'Blocked.' });

		expect(error).toBeInstanceOf(Error);
		expect(error).toMatchObject({
			name: 'ApiError',
			status: 451,
			errorCode: 'GEO_RESTRICTED',
			message: 'Blocked.'
		});
	});
});

describe('parseApiError', () => {
	it('reads the errorCode and message from the backend error body', async () => {
		const error: ApiError = await parseApiError(json(errorBody(), 403));

		expect(error).toBeInstanceOf(ApiError);
		expect(error).toMatchObject({
			status: 403,
			errorCode: 'CONTENT_PRIVATE',
			message: 'This content is private.'
		});
	});

	it('keeps a code the frontend has never heard of', async () => {
		const error: ApiError = await parseApiError(
			json(errorBody({ errorCode: 'SOMETHING_NEW', status: 500 }), 500)
		);

		expect(error.errorCode).toBe('SOMETHING_NEW');
	});

	it('takes the status from the response, not the body', async () => {
		const error: ApiError = await parseApiError(json(errorBody({ status: 500 }), 403));

		expect(error.status).toBe(403);
	});

	it('falls back to the status when the body has no message', async () => {
		const response = new Response(JSON.stringify({ errorCode: 'UPSTREAM_BLOCKED' }), {
			status: 503,
			statusText: 'Service Unavailable'
		});

		const error: ApiError = await parseApiError(response);

		expect(error).toMatchObject({
			errorCode: 'UPSTREAM_BLOCKED',
			message: 'The API responded 503 Service Unavailable.'
		});
	});

	it.each([
		['unreachable', 502],
		['timeout', 504]
	])('maps the forwarder reporting %s to API_UNREACHABLE', async (code, status) => {
		const error: ApiError = await parseApiError(forwarded(status, code));

		expect(error).toMatchObject({ status, errorCode: 'API_UNREACHABLE' });
	});

	it.each([
		['a forwarder error other than unreachable', forwarded(500, 'not-configured')],
		['an HTML page from a proxy', new Response('<html>Bad Gateway</html>', { status: 502 })],
		['an empty body', new Response(null, { status: 500 })],
		['JSON without an errorCode', json({ status: 500, error: 'Internal Server Error' }, 500)],
		['an empty errorCode', json(errorBody({ errorCode: '' }), 500)],
		['a JSON value that is not an object', json('oops', 500)]
	])('gives UNKNOWN_ERROR for %s', async (_label, response) => {
		const error: ApiError = await parseApiError(response);

		expect(error).toMatchObject({ status: response.status, errorCode: 'UNKNOWN_ERROR' });
	});

	it('never throws, even when the body cannot be read', async () => {
		const unreadable = { ok: false, status: 500, statusText: '' } as Response;

		await expect(parseApiError(unreadable)).resolves.toMatchObject({
			status: 500,
			errorCode: 'UNKNOWN_ERROR',
			message: 'The API responded 500.'
		});
	});
});
