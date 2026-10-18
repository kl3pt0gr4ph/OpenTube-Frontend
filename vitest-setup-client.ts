/**
 * Vitest Setup File - Client/Browser Tests
 *
 * Setup for client-side/browser tests (jsdom environment)
 * Runs before each client test suite.
 */

import { beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import './src/tests/matchers';
import { memoryStorage } from './src/tests/helpers/memoryStorage';

vi.mock('$app/env', () => ({
	browser: true,
	building: false,
	dev: false,
	version: 'test'
}));

vi.mock('$app/env/public', () => ({
	PUBLIC_API_URL: 'http://localhost:8000/api/v1',
	PUBLIC_PROXY_URL: 'http://localhost:8888'
}));

vi.mock('$app/state', () => ({
	page: {
		url: new URL('http://localhost/'),
		params: {},
		route: { id: null },
		status: 200,
		error: null,
		data: {},
		state: {},
		form: undefined
	},
	navigating: {
		from: null,
		to: null,
		type: null,
		willUnload: null,
		delta: null,
		complete: null
	},
	updated: {
		current: false,
		check: vi.fn(async () => false)
	}
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn(() => Promise.resolve()),
	refreshAll: vi.fn(() => Promise.resolve())
}));

vi.mock('$app/paths', () => ({
	resolve: (route: string, params?: Record<string, string>) => {
		const path = params
			? Object.entries(params).reduce(
					(acc, [key, value]) => acc.replace(`[${key}]`, encodeURIComponent(value)),
					route
				)
			: route;
		return path.startsWith('/') ? path : `/${path}`;
	},
	asset: (file: string) => `/${file}`
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
