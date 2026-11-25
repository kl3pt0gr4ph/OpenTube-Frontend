import { describe, it, expect, vi, type MockedFunction } from 'vitest';
import {
	createSuccessfulFetch,
	createApiErrorFetch,
	createNetworkErrorFetch,
	extractQueryParams
} from './apiHelpers';

interface JsonFetcherSpec<R, T = R> {
	name: string;
	call: (id: string, fetchFn?: typeof globalThis.fetch) => Promise<R>;
	endpoint: string;
	idIn?: 'query' | 'path';
	idParam?: string;
	fixture: T;
	expected?: R;
}

export function describeJsonFetcher<R, T = R>(spec: JsonFetcherSpec<R, T>): void {
	const expected = (spec.expected ?? spec.fixture) as R;
	const idParam: string = spec.idParam ?? 'id';
	const idIn: 'query' | 'path' = spec.idIn ?? 'query';

	describe(`${spec.name} (fetcher contract)`, (): void => {
		it('calls the endpoint once with the URL-encoded id', async (): Promise<void> => {
			const id = 'abc 123&x=y';

			const fetchFn: MockedFunction<typeof fetch> = createSuccessfulFetch(spec.fixture);
			await spec.call(id, fetchFn as never);
			expect(fetchFn).toHaveBeenCalledTimes(1);
			const url: string = fetchFn.mock.calls[0][0] as string;
			if (idIn === 'path') {
				// Trailing slash matters: '/kiosk' would otherwise pass against '/kiosks/abc'.
				expect(url).toContain(`${spec.endpoint}/`);
				const path: string = url.split('?')[0];
				const segment: string = path.slice(path.lastIndexOf('/') + 1);
				expect(segment).toBe(encodeURIComponent(id));
			} else {
				expect(url).toContain(spec.endpoint);
				expect(extractQueryParams(url)[idParam]).toBe(id);
			}
		});

		it('returns the parsed JSON body unmodified', async (): Promise<void> => {
			const fetchFn: {
				(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
				(input: string | URL | Request, init?: RequestInit): Promise<Response>;
			} = createSuccessfulFetch(spec.fixture);
			await expect(spec.call('id1', fetchFn as never)).resolves.toEqual(expected);
		});

		it('uses global fetch when none is injected', async (): Promise<void> => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				statusText: 'OK',
				json: vi.fn().mockResolvedValue(spec.fixture)
			}) as never;
			await expect(spec.call('id1')).resolves.toEqual(expected);
			expect(global.fetch).toHaveBeenCalledTimes(1);
		});

		it.each([
			[404, 'CONTENT_UNAVAILABLE'],
			[503, 'UPSTREAM_BLOCKED']
		])(
			'rejects with an ApiError carrying the backend errorCode on HTTP %i',
			async (status: number, errorCode: string): Promise<void> => {
				await expect(
					spec.call('bad-id', createApiErrorFetch(status, errorCode, 'From the API.'))
				).rejects.toMatchObject({ name: 'ApiError', status, errorCode, message: 'From the API.' });
			}
		);

		it('rejects with API_UNREACHABLE when no response arrives', async (): Promise<void> => {
			await expect(
				spec.call('id1', createNetworkErrorFetch('Failed to fetch'))
			).rejects.toMatchObject({ name: 'ApiError', status: 0, errorCode: 'API_UNREACHABLE' });
		});
	});
}
