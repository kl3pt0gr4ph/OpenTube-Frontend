import { type DefinedEnvVars, defineEnvVars } from '@sveltejs/kit/env';
import { building } from '$app/env';

/**
 * Checked when the server starts, so a missing or mistyped backend address stops
 * the container straight away instead of turning every /api request into a 500.
 * Optional while building, where nothing is forwarded.
 */
function backendUrl(value: string | undefined): string | undefined {
	if (building && !value) return undefined;
	if (!value?.trim()) {
		throw new Error('API_URL must be set to the backend address, e.g. http://backend:5050');
	}

	let url: URL;
	try {
		url = new URL(value.trim());
	} catch {
		throw new Error(`API_URL is not a valid URL: ${value}`);
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error(`API_URL must be an http or https URL, got ${url.protocol}`);
	}
	return value.trim();
}

export const variables: DefinedEnvVars<{
	PUBLIC_PROXY_URL: {
		public: true;
		static: true;
	};
	PUBLIC_API_URL: {
		public: true;
		static: true;
	};
	API_URL: {
		description: string;
		schema: (value: string | undefined) => string | undefined;
	};
}> = defineEnvVars({
	PUBLIC_PROXY_URL: { public: true, static: true },
	PUBLIC_API_URL: { public: true, static: true },
	API_URL: {
		description:
			'Backend (NewPipeExtractorAPI) origin that /api forwards to, read at runtime, e.g. http://backend:5050',
		schema: backendUrl
	}
});
