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
	private lockedKeys = new Set<string | symbol>()

	private queuedCountByKey = new Map<string | symbol, number>()

	enqueue(item: T, key?: string | symbol): void {
		this.list.insertLast({ item, key })

		if (key !== undefined) this.incrementKeyCount(key)
	}

	next(): KeyLockedEntry<T> | undefined {
		let item = this.list.head()

		while (item) {
			const entry = item.getValue()
			const key = entry.key

			// No key → always consumable
			if (key === undefined) {
				this.list.remove(item)
				return entry
			}

			// Key not locked → lock key and consume item
			if (!this.lockedKeys.has(key)) {
				this.lockedKeys.add(key)
				this.list.remove(item)
				this.decrementKeyCount(key)
				return entry
			}

			// Key locked → skip and keep scanning
			item = item.getNext()
		}

		return undefined
	}

	/**
	 * Unlock a key.
	 * @returns Number of items still queued under that key (now consumable)
	 */
	release(key?: string | symbol): number {
		if (key === undefined) return 0

		this.lockedKeys.delete(key)

		return this.queuedCountByKey.get(key) ?? 0
	}

	releaseAll(): number {
		let total = 0

		for (const key of this.lockedKeys)
			total += this.queuedCountByKey.get(key) ?? 0

		this.lockedKeys.clear()

		return total
	}

	isEmpty(): boolean {
		return this.list.isEmpty()
	}

	private incrementKeyCount(key: string | symbol): void {
		this.queuedCountByKey.set(key, (this.queuedCountByKey.get(key) ?? 0) + 1)
	}

	private decrementKeyCount(key: string | symbol): void {
		const count = this.queuedCountByKey.get(key)
		if (count === undefined) return

		if (count <= 1) this.queuedCountByKey.delete(key)
		else this.queuedCountByKey.set(key, count - 1)
	}
}
