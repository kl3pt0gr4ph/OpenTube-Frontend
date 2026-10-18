import { expect } from 'vitest';

expect.extend({
	toBeValidLanguageCode(received: string) {
		const pass = /^[a-z]{2}(-[A-Z0-9]+)?$/.test(received);
		return {
			pass,
			message: () =>
				pass
					? `expected ${received} not to be a valid language code`
					: `expected ${received} to be a valid language code (e.g., 'en', 'es-419')`
		};
	},

	toBeValidUrl(received: string) {
		let pass = false;
		try {
			new URL(received);
			pass = true;
		} catch {
			// URL is invalid
		}
		return {
			pass,
			message: () =>
				pass
					? `expected ${received} not to be a valid URL`
					: `expected ${received} to be a valid URL`
		};
	}
});

declare module 'vitest' {
	interface Matchers<R> {
		toBeValidLanguageCode: () => R;
		toBeValidUrl: () => R;
	}
}
