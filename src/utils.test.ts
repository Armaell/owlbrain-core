import { describe, expect, it } from "vitest"
import { RingBuffer } from "./utils"

describe("RingBuffer", () => {
	it("pushes and retrieves values in order", () => {
		const buf = new RingBuffer<number>(3)

		buf.push(1)
		buf.push(2)
		buf.push(3)

		expect(buf.toArray()).toEqual([1, 2, 3])
	})

	it("overwrites oldest values when full", () => {
		const buf = new RingBuffer<number>(3)

		buf.push(1)
		buf.push(2)
		buf.push(3)
		buf.push(4)

		expect(buf.toArray()).toEqual([2, 3, 4])
	})

	it("handles partial fill correctly", () => {
		const buf = new RingBuffer<number>(5)

		buf.push(10)
		buf.push(20)

		expect(buf.toArray()).toEqual([10, 20])
	})

	it("clears", () => {
		const buf = new RingBuffer<number>(3)

		buf.push(1)
		buf.push(2)
		buf.clear()

		expect(buf.toArray()).toEqual([])
	})
})
