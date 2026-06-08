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
	private lockedItems = new Map<string | symbol, WeakSet<object>>()

	enqueue(item: T, key?: string | symbol): void {
		this.list.insertLast({ item, key })
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
				this.lockedItems.delete(key)
				return entry
			}

			// Key locked → mark item as locked
			{
				let keyLockedItems = this.lockedItems.get(key)
				if (!keyLockedItems) {
					keyLockedItems = new WeakSet()
					this.lockedItems.set(key, keyLockedItems)
				}
				if (!keyLockedItems.has(item)) {
					keyLockedItems.add(item)
				}
			}

			item = item.getNext()
		}

		return undefined
	}

	/**
	 * @returns Number of released entries
	 */
	release(key?: string | symbol): number {
		if (key === undefined) return 0

		this.lockedKeys.delete(key)

		const count = this.weakSetSize(this.lockedItems.get(key))
		this.lockedItems.delete(key)

		return count
	}

	releaseAll(): number {
		let total = 0

		for (const key of this.lockedKeys)
			total += this.weakSetSize(this.lockedItems.get(key))

		this.lockedKeys.clear()
		this.lockedItems.clear()

		return total
	}

	isEmpty(): boolean {
		return this.list.isEmpty()
	}

	private weakSetSize(set: WeakSet<object> | undefined): number {
		if (!set) return 0

		let count = 0
		let node = this.list.head()
		while (node) {
			if (set.has(node)) count++
			node = node.getNext()
		}

		return count
	}
}
