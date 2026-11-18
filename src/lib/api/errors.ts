/**
 * Errors from NewPipeExtractorAPI, plus the codes the frontend adds for failures
 * that never got an error body from it.
 *
 * Branch on `errorCode`, never on `status` or `message`. The backend's message is
 * reworded freely, and a code can move to another status in a major release.
 */

export type BackendErrorCode =
	| 'MISSING_PARAMETER'
	| 'VALIDATION_ERROR'
	| 'NOT_FOUND'
	| 'METHOD_NOT_ALLOWED'
	| 'CONTENT_UNAVAILABLE'
	| 'CONTENT_PRIVATE'
	| 'AGE_RESTRICTED'
	| 'PAID_CONTENT'
	| 'GEO_RESTRICTED'
	| 'ACCOUNT_TERMINATED'
	| 'UPSTREAM_BLOCKED'
	| 'UPSTREAM_CHANGED'
	| 'UPSTREAM_UNREACHABLE'
	| 'NO_STREAMS_AVAILABLE'
	| 'EXTRACTION_ERROR'
	| 'INTERNAL_ERROR';

/**
 * Codes the frontend assigns itself:
 * - `API_UNREACHABLE`: no response from the API, either here or at the /api forwarder.
 * - `INVALID_RESPONSE`: the API answered with something the frontend can't read.
 * - `UNKNOWN_ERROR`: an error response without the backend's error body.
 */
export type ClientErrorCode = 'API_UNREACHABLE' | 'INVALID_RESPONSE' | 'UNKNOWN_ERROR';

export type KnownErrorCode = BackendErrorCode | ClientErrorCode;
export type ApiErrorCode = KnownErrorCode | (string & {});

/** The body NewPipeExtractorAPI sends with every error response. */
export interface ErrorResponse {
	timestamp: string;
	status: number;
	error: string;
	message: string;
	errorCode: string;
	path: string;
	detail?: string;
}

export interface ApiErrorInit {
	status: number;
	errorCode: ApiErrorCode;
	message: string;
	cause?: unknown;
}

export class ApiError extends Error {
	override readonly name = 'ApiError';
	readonly status: number;
	readonly errorCode: ApiErrorCode;

	constructor({ status, errorCode, message, cause }: ApiErrorInit) {
		super(message, cause === undefined ? undefined : { cause });
		this.status = status;
		this.errorCode = errorCode;
	}
}

export const API_UNREACHABLE_MESSAGE = "The API couldn't be reached.";

const FORWARDER_UNREACHABLE: ReadonlySet<string> = new Set(['unreachable', 'timeout']);

export function invalidResponse(status: number, message: string, cause?: unknown): ApiError {
	return new ApiError({ status, errorCode: 'INVALID_RESPONSE', message, cause });
}

/**
 * Turns a non-2xx response into an ApiError. Never throws: a body that isn't the
 * backend's error shape becomes UNKNOWN_ERROR, or API_UNREACHABLE.
 */
export async function parseApiError(res: Response): Promise<ApiError> {
	const status: number = res.status;
	const statusMessage = `The API responded ${status}${res.statusText ? ` ${res.statusText}` : ''}.`;
	const body = backendErrorBody(await readJson(res));

	if (body) {
		return new ApiError({
			status,
			errorCode: body.errorCode,
			message: body.message ?? statusMessage
		});
	}

	const forwarderError: string | null | undefined = res.headers?.get('x-api-error');
	if (forwarderError && FORWARDER_UNREACHABLE.has(forwarderError)) {
		return new ApiError({ status, errorCode: 'API_UNREACHABLE', message: API_UNREACHABLE_MESSAGE });
	}

	return new ApiError({ status, errorCode: 'UNKNOWN_ERROR', message: statusMessage });
}

async function readJson(res: Response): Promise<unknown> {
	try {
		return JSON.parse(await res.text());
	} catch {
		return null;
	}
}

function backendErrorBody(body: unknown): { errorCode: string; message: string | null } | null {
	if (typeof body !== 'object' || body === null) return null;

	const { errorCode, message } = body as Partial<Record<keyof ErrorResponse, unknown>>;
	if (typeof errorCode !== 'string' || errorCode === '') return null;

	return { errorCode, message: typeof message === 'string' && message !== '' ? message : null };
}
