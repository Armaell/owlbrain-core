import { DoublyLinkedList } from "@datastructures-js/linked-list"

export interface KeyLockedEntry<T> {
	item: T
	key?: string | symbol
}

/**
 * A FIFO queue that enforces per‑key locking when consuming items
 *
 * - You can enqueue items with an optional `key`
 * - Calling `next()` returns the first item whose key is not currently locked
 * - When an item with a key is returned, that key becomes locked
 * - While a key is locked, other items with the same key are skipped
 * - Once processing of an item is finished, call `release(key)` to unlock it
 */
export class KeyLockedQueue<T> {
	private list = new DoublyLinkedList<KeyLockedEntry<T>>()
	private locked = new Set<string | symbol>()
	private skippedCounts = new Map<string | symbol, number>()

	enqueue(item: T, key?: string | symbol): void {
		this.list.insertLast({ item, key })
	}

	next(): KeyLockedEntry<T> | undefined {
		let node = this.list.head()

		while (node) {
			const entry = node.getValue()
			const key = entry.key

			// No key → always consumable
			if (key === undefined) {
				this.list.remove(node)
				return entry
			}

			// Key not locked → lock it and consume
			if (!this.locked.has(key)) {
				this.locked.add(key)
				this.list.remove(node)
				this.skippedCounts.delete(key)
				return entry
			}

			// Key locked → count as skipped
			{
				this.skippedCounts.set(key, (this.skippedCounts.get(key) ?? 0) + 1)
				node = node.getNext()
			}
		}

		return undefined
	}

	/**
	 * @returns Number of released entries
	 */
	release(key?: string | symbol): number {
		if (key === undefined) return 0

		this.locked.delete(key)

		const count = this.skippedCounts.get(key) ?? 0
		this.skippedCounts.delete(key)

		return count
	}

	releaseAll(): number {
		let total = 0

		for (const key of this.locked) {
			total += this.skippedCounts.get(key) ?? 0
		}

		this.locked.clear()
		this.skippedCounts.clear()

		return total
	}

	isEmpty(): boolean {
		return this.list.isEmpty()
	}
}
