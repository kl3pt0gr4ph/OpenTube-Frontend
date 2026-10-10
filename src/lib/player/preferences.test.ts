import { describe, it, expect, beforeEach } from 'vitest';
import {
	DEFAULT_PREFERENCES,
	PREFERENCES_STORAGE_KEY,
	loadPreferences,
	savePreferences
} from './preferences';

/** Storage whose every call throws, like localStorage with site data blocked. */
const throwingStorage = {
	getItem: () => {
		throw new Error('blocked');
	},
	setItem: () => {
		throw new Error('blocked');
	}
} as unknown as Storage;

beforeEach(() => {
	localStorage.clear();
});

describe('loadPreferences', () => {
	it('returns the defaults when nothing is stored', () => {
		expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
	});

	it('returns a copy, so callers cannot mutate the defaults', () => {
		const prefs = loadPreferences();
		prefs.audioLanguage = 'de';

		expect(DEFAULT_PREFERENCES.audioLanguage).toBe('');
	});

	it('reads stored preferences', () => {
		localStorage.setItem(
			PREFERENCES_STORAGE_KEY,
			JSON.stringify({ maxHeight: 720, audioLanguage: 'de', textLanguage: 'en' })
		);

		expect(loadPreferences()).toEqual({ maxHeight: 720, audioLanguage: 'de', textLanguage: 'en' });
	});

	it.each([
		['invalid JSON', '{not json'],
		['a non-object', '"just a string"'],
		[
			'wrong field types',
			JSON.stringify({ maxHeight: '720', audioLanguage: 1, textLanguage: null })
		],
		['a non-positive height', JSON.stringify({ maxHeight: 0 })]
	])('falls back to defaults for %s', (_name, raw) => {
		localStorage.setItem(PREFERENCES_STORAGE_KEY, raw);

		expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
	});

	it('returns the defaults when storage throws', () => {
		expect(loadPreferences(throwingStorage)).toEqual(DEFAULT_PREFERENCES);
	});
});

describe('savePreferences', () => {
	it('merges the update into what is stored', () => {
		savePreferences({ audioLanguage: 'de' });
		savePreferences({ textLanguage: 'en' });

		expect(loadPreferences()).toEqual({ maxHeight: null, audioLanguage: 'de', textLanguage: 'en' });
	});

	it('returns the merged preferences', () => {
		expect(savePreferences({ maxHeight: 1080 })).toEqual({
			maxHeight: 1080,
			audioLanguage: '',
			textLanguage: ''
		});
	});

	it('still returns the merged value when storage throws', () => {
		expect(savePreferences({ textLanguage: 'fr' }, throwingStorage)).toEqual({
			maxHeight: null,
			audioLanguage: '',
			textLanguage: 'fr'
		});
	});
});
