/**
 * Viewer playback preferences, persisted in localStorage.
 *
 * Only choices that should carry over between videos live here. A manually
 * picked quality is deliberately not persisted: every new video starts on Auto.
 */
export interface PlayerPreferences {
	maxHeight: number | null;
	audioLanguage: string;
	textLanguage: string;
	bandwidthEstimate: number | null;
}

export const DEFAULT_PREFERENCES: Readonly<PlayerPreferences> = {
	maxHeight: null,
	audioLanguage: '',
	textLanguage: '',
	bandwidthEstimate: null
};

export const PREFERENCES_STORAGE_KEY = 'player:preferences';

/** localStorage can throw on access (blocked site data, some private modes). */
function defaultStorage(): Storage | undefined {
	try {
		return globalThis.localStorage;
	} catch {
		return undefined;
	}
}

/** Keeps only well-formed values, so a corrupted or outdated entry can't break playback. */
function sanitize(value: unknown): PlayerPreferences {
	const stored = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
	return {
		maxHeight:
			typeof stored.maxHeight === 'number' && stored.maxHeight > 0 ? stored.maxHeight : null,
		audioLanguage: typeof stored.audioLanguage === 'string' ? stored.audioLanguage : '',
		textLanguage: typeof stored.textLanguage === 'string' ? stored.textLanguage : '',
		bandwidthEstimate:
			typeof stored.bandwidthEstimate === 'number' && stored.bandwidthEstimate > 0
				? stored.bandwidthEstimate
				: null
	};
}

export function loadPreferences(
	storage: Storage | undefined = defaultStorage()
): PlayerPreferences {
	try {
		const raw: string | null | undefined = storage?.getItem(PREFERENCES_STORAGE_KEY);
		return raw ? sanitize(JSON.parse(raw)) : { ...DEFAULT_PREFERENCES };
	} catch {
		return { ...DEFAULT_PREFERENCES };
	}
}

/**
 * Merges an update into the stored preferences and returns the result.
 * If storage is unavailable the merged value is still returned, so the
 * current session keeps the choice even though it won't survive a reload.
 */
export function savePreferences(
	update: Partial<PlayerPreferences>,
	storage: Storage | undefined = defaultStorage()
): PlayerPreferences {
	const next = sanitize({ ...loadPreferences(storage), ...update });
	try {
		storage?.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(next));
	} catch {
		// Quota exceeded or storage blocked: keep the in-memory value only
	}
	return next;
}
