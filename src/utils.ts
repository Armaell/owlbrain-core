export function createGlobalSingleton<T>(key: string, factory: () => T): T {
	const globalKey = Symbol.for(key)
	const globalAny = globalThis as any

	if (!globalAny[globalKey]) {
		globalAny[globalKey] = factory()
	}

	return globalAny[globalKey] as T
}

/**
 * A fixed‑capacity buffer. Store up to `capacity` items, then delete the oldest when full.
 */
export class RingBuffer<T> {
	private buffer: Array<T | null>
	private index = 0
	private count = 0

	/**
	 * @param {number} capacity - Maximum number of items the buffer can hold.
	 */
	constructor(private readonly capacity: number) {
		this.buffer = new Array(capacity).fill(null)
	}

	/**
	 * Pushes a new value into the buffer.
	 * If the buffer is full, the oldest value is overwritten.
	 */
	push(value: T) {
		this.buffer[this.index] = value
		this.index = (this.index + 1) % this.capacity

		if (this.count < this.capacity) {
			this.count++
		}
	}

	/**
	 * Returns the buffer contents ordered from oldest to newest.
	 */
	toArray(): T[] {
		const result: T[] = []

		for (let i = 0; i < this.count; i++) {
			const idx = (this.index - this.count + i + this.capacity) % this.capacity
			const value = this.buffer[idx]
			if (value !== null) result.push(value)
		}

		return result
	}

	/**
	 * Clears the buffer, removing all stored values.
	 */
	clear() {
		this.buffer.fill(null)
		this.index = 0
		this.count = 0
	}
}
