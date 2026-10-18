/**
 * Vitest Setup File - Server Tests
 *
 * Setup for server-side tests (Node environment)
 * Runs before each server test suite.
 */

import { beforeEach, afterEach, beforeAll, vi } from 'vitest';
import './src/tests/matchers';
import { memoryStorage } from './src/tests/helpers/memoryStorage';

vi.mock('$app/env/public', () => ({
	PUBLIC_API_URL: 'http://localhost:8000/api/v1',
	PUBLIC_PROXY_URL: 'http://localhost:8888'
}));

vi.mock('#lib/assets/placeholders/logofallback.svg', () => ({
	default: 'mock-logo-placeholder.svg'
}));

vi.mock('#lib/assets/placeholders/thumbnailFallback.svg', () => ({
	default: 'mock-thumbnail-placeholder.svg'
}));

beforeEach(() => {
	vi.stubGlobal('localStorage', memoryStorage());
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

beforeAll(() => {
	process.env.NODE_ENV = 'test';
});
