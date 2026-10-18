import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_PROXY_URL: { public: true, static: true },
	PUBLIC_API_URL: { public: true, static: true }
});
