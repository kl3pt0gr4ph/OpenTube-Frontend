import {
	API_UNREACHABLE_MESSAGE,
	ApiError,
	invalidResponse,
	parseApiError
} from '#lib/api/errors.ts';

/**
 * Requests an API URL. Resolves with the response when it's 2XX.
 * Every other outcome, including no response at all, rejects with an ApiError.
 */
export async function apiFetch(
	url: string,
	fetchFn: typeof globalThis.fetch = globalThis.fetch
): Promise<Response> {
	let res: Response;
	try {
		res = await fetchFn(url);
	} catch (cause) {
		throw new ApiError({
			status: 0,
			errorCode: 'API_UNREACHABLE',
			message: API_UNREACHABLE_MESSAGE,
			cause
		});
	}

	if (!res.ok) throw await parseApiError(res);
	return res;
}

/** apiFetch, then the body as JSON. A body that isn't JSON rejects with INVALID_RESPONSE. */
export async function apiFetchJson<T>(url: string, fetchFn?: typeof globalThis.fetch): Promise<T> {
	const res: Response = await apiFetch(url, fetchFn);
	try {
		return (await res.json()) as T;
	} catch (cause) {
		throw invalidResponse(res.status, "The API's response wasn't valid JSON.", cause);
	}
}
