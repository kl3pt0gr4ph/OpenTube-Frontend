/**
 * Removes items whose key has already been seen, keeping the first occurrence
 * and the original order.
 */
export function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
	const seen = new Set<string>();
	return items.filter((item: T): boolean => {
		const k: string = key(item);
		if (seen.has(k)) return false;
		seen.add(k);
		return true;
	});
}
