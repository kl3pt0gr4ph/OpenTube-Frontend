/**
 * Vitest Setup File - Server Tests
 *
 * Setup for server-side tests (Node environment)
 * Runs before each server test suite.
 */

import { beforeEach, afterEach, beforeAll, vi } from 'vitest';
import './src/tests/matchers';

vi.mock('$env/static/public', () => ({
	PUBLIC_API_URL: 'http://localhost:8000/api/v1',
	PUBLIC_PROXY_URL: 'http://localhost:8888'
}));

vi.mock('$lib/assets/placheholders/logofallback.svg', () => ({
	default: 'mock-logo-placeholder.svg'
}));

vi.mock('$lib/assets/placeholders/thumbnailFallback.svg', () => ({
	default: 'mock-thumbnail-placeholder.svg'
}));

class MemoryStorage implements Storage {
	private items = new Map<string, string>();

	get length(): number {
		return this.items.size;
	}

	clear(): void {
		this.items.clear();
	}

	getItem(key: string): string | null {
		return this.items.get(key) ?? null;
	}

	key(index: number): string | null {
		return [...this.items.keys()][index] ?? null;
	}

	removeItem(key: string): void {
		this.items.delete(key);
	}

	setItem(key: string, value: string): void {
		this.items.set(key, String(value));
	}
}

beforeEach(() => {
	vi.stubGlobal('localStorage', new MemoryStorage());
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

beforeAll(() => {
	process.env.NODE_ENV = 'test';
});
