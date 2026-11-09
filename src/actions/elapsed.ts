export function elapsed(milliseconds: number): string {
	const seconds = Math.max(0, Math.floor(milliseconds / 1000));
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const twoDigits = (value: number) => String(value).padStart(2, "0");
	return hours > 0
		? `${hours}:${twoDigits(minutes % 60)}:${twoDigits(seconds % 60)}`
		: `${minutes}:${twoDigits(seconds % 60)}`;
}
