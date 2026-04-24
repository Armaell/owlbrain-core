import { describe, expect, it } from "vitest"
import { KeyLockedQueue } from "./key-locked-queue"

describe("KeyLockedQueue", () => {
	it("handles locking, skipping, releasing, and replaying correctly with extra items", () => {
		const q = new KeyLockedQueue<string>()

		// Given A, A, B, C, A, B, C
		q.enqueue("A1", "A")
		q.enqueue("A2", "A")
		q.enqueue("B1", "B")
		q.enqueue("C1", "C")
		q.enqueue("A3", "A")
		q.enqueue("B2", "B")
		q.enqueue("C2", "C")

		// next() → returns first A, locks A
		const first = q.next()
		expect(first?.item).toBe("A1")
		expect(first?.key).toBe("A")

		// next() → skips A, returns B (locks B)
		const second = q.next()
		expect(second?.item).toBe("B1")
		expect(second?.key).toBe("B")

		// next() → skips A, skips B, returns C (locks C)
		const third = q.next()
		expect(third?.item).toBe("C1")
		expect(third?.key).toBe("C")

		// Release A
		q.release("A")

		// next() → returns second A
		const fourth = q.next()
		expect(fourth?.item).toBe("A2")
		expect(fourth?.key).toBe("A")

		// Release B
		q.release("B")

		// next() → returns second B
		const fifth = q.next()
		expect(fifth?.item).toBe("B2")
		expect(fifth?.key).toBe("B")

		// Release C
		q.release("C")

		// next() → returns second C
		const sixth = q.next()
		expect(sixth?.item).toBe("C2")
		expect(sixth?.key).toBe("C")

		// next() → returns third A
		const seventh = q.next()
		expect(seventh).toBeUndefined()

		q.release("A")

		// next() → returns third A
		const eight = q.next()
		expect(eight?.item).toBe("A3")
		expect(eight?.key).toBe("A")

		// queue should now be empty
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
})
