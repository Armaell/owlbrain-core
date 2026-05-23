import { beforeAll, describe, expect, it, vi } from "vitest"
import { InMemoryEventBus } from "./in-memory-event-bus"
import { Logger } from "../logging/logger"

describe("InMemoryEventBus", () => {
	beforeAll(() => {
		Logger.levels.setDefault("MUTE")
	})

	it("should call listeners when an event is emitted", async () => {
		const bus = new InMemoryEventBus()

		const listener = vi.fn()
		bus.listen(listener)

		await bus.emit({
			name: "test_event",
			namespace: "test"
		})

		expect(listener).toHaveBeenCalledTimes(1)
		expect(listener.mock.calls[0][0]).toMatchObject({
			name: "test_event",
			namespace: "test"
		})
	})

	it("should not crash if a listener throws", async () => {
		const bus = new InMemoryEventBus()

		const badListener = vi.fn().mockRejectedValue(new Error("boom"))
		const goodListener = vi.fn()

		bus.listen(badListener)
		bus.listen(goodListener)

		await bus.emit({
			name: "safe_event"
		})

		expect(goodListener).toHaveBeenCalled()
	})

	it("should attach datetime to emitted events", async () => {
		const bus = new InMemoryEventBus()

		const listener = vi.fn()
		bus.listen(listener)

		await bus.emit({
			name: "with_date"
		})

		const event = listener.mock.calls[0][0]
		expect(event.datetime).toBeInstanceOf(Date)
	})
})
