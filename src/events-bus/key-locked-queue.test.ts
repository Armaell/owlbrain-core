import { describe, expect, it } from "vitest"
import { KeyLockedQueue } from "./key-locked-queue"

describe("KeyLockedQueue", () => {
	it("handles locking, skipping, releasing, and replaying correctly with extra items", () => {
		const q = new KeyLockedQueue<string>()

		q.enqueue("A1", "A")
		q.enqueue("A2", "A")
		q.enqueue("B1", "B")
		q.enqueue("C1", "C")
		q.enqueue("A3", "A")
		q.enqueue("B2", "B")
		q.enqueue("C2", "C")

		// returns A1, locks A
		const first = q.next()
		expect(first?.item).toBe("A1")
		expect(first?.key).toBe("A")

		// skips A, returns B1 (locks B)
		const second = q.next()
		expect(second?.item).toBe("B1")
		expect(second?.key).toBe("B")

		// skips A and B, returns C1 (locks C)
		const third = q.next()
		expect(third?.item).toBe("C1")
		expect(third?.key).toBe("C")

		// Release A
		const releasedCount1 = q.release("A")
		expect(releasedCount1).toBe(2) // A2 and A3 released

		// returns A2
		const fourth = q.next()
		expect(fourth?.item).toBe("A2")
		expect(fourth?.key).toBe("A")

		// Release B
		const releasedCount2 = q.release("B")
		expect(releasedCount2).toBe(1) // B2 released

		// returns B2
		const fifth = q.next()
		expect(fifth?.item).toBe("B2")
		expect(fifth?.key).toBe("B")

		// Release C
		const releasedCount3 = q.release("C")
		expect(releasedCount3).toBe(1) // C2 released

		// returns C2
		const sixth = q.next()
		expect(sixth?.item).toBe("C2")
		expect(sixth?.key).toBe("C")

		// A, B and C are all locked, nothing to return
		const seventh = q.next()
		expect(seventh).toBeUndefined()

		const releasedCount4 = q.release("A")
		expect(releasedCount4).toBe(1) // A3 released

		// returns A3
		const eight = q.next()
		expect(eight?.item).toBe("A3")
		expect(eight?.key).toBe("A")

		// queue is now empty
		expect(q.next()).toBeUndefined()
	})

	it("never locks undefined keys", () => {
		const q = new KeyLockedQueue<string>()

		q.enqueue("X") // undefined key
		q.enqueue("Y") // undefined key
		q.enqueue("Z", "Z") // defined key

		// undefined keys should always be allowed
		const first = q.next()
		expect(first?.item).toBe("X")
		expect(first?.key).toBeUndefined()

		const second = q.next()
		expect(second?.item).toBe("Y")
		expect(second?.key).toBeUndefined()

		// Z should still be allowed because undefined keys never lock anything
		const third = q.next()
		expect(third?.item).toBe("Z")
		expect(third?.key).toBe("Z")
	})

	it("gives the correct number of released items on key release", () => {
		const q = new KeyLockedQueue<string>()
		q.enqueue("A1", "A")
		q.enqueue("A2", "A")
		q.enqueue("A3", "A")
		q.enqueue("B1", "B")
		q.enqueue("A4", "A")
		q.enqueue("A5", "A")

		const first = q.next() // returns A1, locks A
		expect(first?.item).toBe("A1")
		const second = q.next() // A is locked, skip to B1
		expect(second?.item).toBe("B1")

		const releasedCount1 = q.release("A")
		expect(releasedCount1).toBe(4) // A2, A3, A4 and A5 released

		const third = q.next() // returns A2, locks A
		expect(third?.item).toBe("A2")
		const fourth = q.next() // A is locked, nothing to return
		expect(fourth).toBeUndefined()

		const releasedCount2 = q.release("A")
		expect(releasedCount2).toBe(3) // A3, A4 and A5 released
	})
})
