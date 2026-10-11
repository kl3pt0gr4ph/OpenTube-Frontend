/**
 * Vitest Setup File - Client/Browser Tests
 *
 * Setup for client-side/browser tests (Playwright environment)
 * Runs before each client test suite.
 */

import { beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import './src/tests/matchers';
import { memoryStorage } from './src/tests/helpers/memoryStorage';

// Mock SvelteKit's $app/environment
vi.mock('$app/environment', () => ({
	browser: true,
	building: false,
	dev: false,
	version: 'test'
}));

// Mock SvelteKit's environment variables
vi.mock('$env/static/public', () => {
	return Promise.resolve({
		PUBLIC_API_URL: 'http://localhost:8000/api/v1',
		PUBLIC_PROXY_URL: 'http://localhost:8888'
	});
});

// Mock $app/stores if needed
vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn()
	},
	navigating: {
		subscribe: vi.fn()
	},
	updated: {
		subscribe: vi.fn()
	}
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$app/paths', () => ({
	resolve: (route: string, params?: Record<string, string>) =>
		params
			? Object.entries(params).reduce(
					(path, [key, value]) => path.replace(`[${key}]`, encodeURIComponent(value)),
					route
				)
			: route,
	base: '',
	assets: ''
}));

beforeEach(() => {
	vi.stubGlobal('localStorage', memoryStorage());
});

// Cleanup after each test
afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

// Browser-specific setup
if (typeof window !== 'undefined') {
	if (!window.IntersectionObserver) {
		window.IntersectionObserver = class IntersectionObserver {
			constructor() {}
			disconnect() {}
			observe() {}
			takeRecords() {
				return [];
			}
			unobserve() {}
		} as unknown as typeof IntersectionObserver;
	}

	if (!window.ResizeObserver) {
		window.ResizeObserver = class ResizeObserver {
			constructor() {}
			disconnect() {}
			observe() {}
			unobserve() {}
		} as unknown as typeof ResizeObserver;
	}

	if (!window.matchMedia) {
		window.matchMedia = (query: string) =>
			({
				matches: false,
				media: query,
				onchange: null,
				addListener: () => {},
				removeListener: () => {},
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => true
			}) as MediaQueryList;
	}
}
