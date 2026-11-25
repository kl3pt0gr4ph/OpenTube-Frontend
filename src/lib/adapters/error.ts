import { ApiError, type ApiErrorCode, type KnownErrorCode } from '#lib/api/errors.ts';

export interface ErrorConfig {
	errorCode: ApiErrorCode;
	variant: 'error' | 'warning' | 'info';
	title: string;
	message: string;
	retryable: boolean;
}

export type ErrorSubject = 'video' | 'channel' | 'playlist' | 'content';

type ErrorCopy = Omit<ErrorConfig, 'errorCode'>;

export const GENERIC_ERROR: Readonly<ErrorCopy> = Object.freeze({
	variant: 'error',
	title: 'Something went wrong',
	message: 'An unexpected error occurred. Try again later.',
	retryable: true
});

const capitalise = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

const unavailable = (title: string, message: string): ErrorCopy => ({
	variant: 'info',
	title,
	message,
	retryable: false
});

const COPY: Partial<Record<KnownErrorCode, (subject: ErrorSubject) => ErrorCopy>> = {
	CONTENT_UNAVAILABLE: (subject) =>
		unavailable(
			`${capitalise(subject)} unavailable`,
			`This ${subject} has been removed, or never existed.`
		),
	CONTENT_PRIVATE: (subject) => unavailable(`Private ${subject}`, `This ${subject} is private.`),
	AGE_RESTRICTED: (subject) =>
		unavailable(
			`Age-restricted ${subject}`,
			`YouTube only shows this ${subject} to signed-in accounts, so it can't be shown here.`
		),
	PAID_CONTENT: (subject) =>
		unavailable(
			`Members-only ${subject}`,
			`This ${subject} is only available to paying members or subscribers.`
		),
	GEO_RESTRICTED: (subject) =>
		unavailable(
			`${capitalise(subject)} not available here`,
			`This ${subject} isn't available in the country this server is in.`
		),
	ACCOUNT_TERMINATED: (subject) =>
		unavailable(
			'Account terminated',
			`The YouTube account behind this ${subject} has been terminated.`
		),
	NO_STREAMS_AVAILABLE: () => ({
		variant: 'warning',
		title: 'No playable streams',
		message: 'No playable streams were found for this video.',
		retryable: true
	}),
	UPSTREAM_BLOCKED: () => ({
		variant: 'warning',
		title: 'YouTube is blocking this server',
		message: 'YouTube is rate-limiting requests from this server. Try again in a few minutes.',
		retryable: true
	}),
	UPSTREAM_UNREACHABLE: () => ({
		variant: 'error',
		title: "Can't reach YouTube",
		message: "The server couldn't reach YouTube. Try again later.",
		retryable: true
	}),
	UPSTREAM_CHANGED: () => ({
		variant: 'error',
		title: 'YouTube has changed',
		message: "The server couldn't read YouTube's response. It may need an update.",
		retryable: false
	}),
	API_UNREACHABLE: () => ({
		variant: 'error',
		title: "Can't reach the server",
		message: "The API couldn't be reached. Check your connection and try again.",
		retryable: true
	})
};

/**
 * Picks what to show for a failed load from its errorCode. The status and the
 * backend's wording are never consulted. Anything that isn't an ApiError, and any
 * code without its own copy, gets the generic card, so a code the backend adds
 * later still renders.
 */
export function adaptError(error: unknown, subject: ErrorSubject = 'content'): ErrorConfig {
	const errorCode: ApiErrorCode = error instanceof ApiError ? error.errorCode : 'UNKNOWN_ERROR';
	const copyFor = Object.hasOwn(COPY, errorCode) ? COPY[errorCode as KnownErrorCode] : undefined;

	return { errorCode, ...(copyFor?.(subject) ?? GENERIC_ERROR) };
}
