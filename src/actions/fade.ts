/**
 * The `duration` of an API call from a fade length chosen in the property inspector, which leaves it out for none.
 */
export function fade(seconds: number | string | boolean | undefined): { duration?: number } {
	const value = Number(seconds);
	return Number.isFinite(value) && value > 0 ? { duration: value } : {};
}
