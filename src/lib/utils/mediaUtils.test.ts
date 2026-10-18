/**
 * Test Suite: mediaUtils.ts
 *
 * Tests for media thumbnail and avatar selection utilities
 */
import { describe, it, expect } from 'vitest';
import { selectBestImage } from './mediaUtils';
import type { Image } from '#lib/types.js';

const t: (url: string, width?: number) => Image = (url: string, width = 100): Image =>
	({ url, width, height: Math.round((width * 9) / 16) }) as Image;

describe('selectBestImage (rule: index 1 → last → first → fallback)', () => {
	it.each([
		['ascending widths → widest', [t('a', 168), t('b', 246), t('c', 336)], 'c'],
		['descending widths → widest', [t('a', 336), t('b', 246), t('c', 168)], 'a'],
		['unordered widths → widest', [t('a', 246), t('b', 336), t('c', 168)], 'b'],
		['equal widths → first', [t('a', 200), t('b', 200), t('c', 200)], 'a'],
		['single element → that one', [t('only', 168)], 'only'],
		['widest url empty → fallback', [t('a', 168), t('', 336)], 'FB'],
		['empty array → fallback', [], 'FB'],
		['undefined → fallback', undefined as never, 'FB']
	])('%s', (_label, thumbs, expected) => {
		expect(selectBestImage(thumbs, 'FB')).toBe(expected);
	});
});
