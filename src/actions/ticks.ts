/**
 * Gathers a dial's ticks and hands them over at most once per interval, so that turning it fast does not send a call for every tick.
 */
export class TickAccumulator {
	readonly #interval: number;
	readonly #flush: (id: string, ticks: number) => void;
	readonly #ticks = new Map<string, number>();
	readonly #timers = new Map<string, NodeJS.Timeout>();

	constructor(interval: number, flush: (id: string, ticks: number) => void) {
		this.#interval = interval;
		this.#flush = flush;
	}

	add(id: string, ticks: number): void {
		this.#ticks.set(id, (this.#ticks.get(id) ?? 0) + ticks);
		if (this.#timers.has(id)) {
			return;
		}
		this.#timers.set(
			id,
			setTimeout(() => {
				const total = this.#ticks.get(id) ?? 0;
				this.#ticks.delete(id);
				this.#timers.delete(id);
				if (total !== 0) {
					this.#flush(id, total);
				}
			}, this.#interval),
		);
	}
}
