import { beforeEach, describe, expect, it } from "vitest"
import { ConsumerRegistry } from "./consumer-registry"
import type { EventsConsumer } from "./consumer"
import type { OwlEvent } from "./events-bus"

describe("ConsumerRegistry", () => {
	let registry: ConsumerRegistry<OwlEvent>

	const makeEvent = (overrides: Partial<OwlEvent>): OwlEvent => ({
		name: "test",
		datetime: new Date(),
		...overrides
	})

	const makeConsumer = (
		overrides: Partial<EventsConsumer<OwlEvent>>
	): EventsConsumer<OwlEvent> => ({
		method: () => {},
		...overrides
	})

	beforeEach(() => {
		registry = new ConsumerRegistry<OwlEvent>()
	})

	describe("event with namespace", () => {
		it("matches consumers with the same namespace plus global consumers", () => {
			const globalConsumer = makeConsumer({})
			const ns1Consumer = makeConsumer({ namespace: "ns1" })
			const ns2Consumer = makeConsumer({ namespace: "ns2" })

			registry.register(globalConsumer)
			registry.register(ns1Consumer)
			registry.register(ns2Consumer)

			const event = makeEvent({ namespace: "ns1" })
			const matched = new Set(registry.match(event))

			expect(matched.has(globalConsumer)).toBe(true)
			expect(matched.has(ns1Consumer)).toBe(true)
			expect(matched.has(ns2Consumer)).toBe(false)
			expect(matched.size).toBe(2)
		})

		describe("but not consumer have been registered with this namespace", () => {
			it("returns only global consumers", () => {
				const globalConsumer = makeConsumer({})
				const otherNsConsumer = makeConsumer({ namespace: "other" })

				registry.register(globalConsumer)
				registry.register(otherNsConsumer)

				const event = makeEvent({ namespace: "missing" })
				const matched = new Set(registry.match(event))

				expect(matched.has(globalConsumer)).toBe(true)
				expect(matched.has(otherNsConsumer)).toBe(false)
				expect(matched.size).toBe(1)
			})
		})
	})

	describe("event without namespace", () => {
		it("matches only global consumers", () => {
			const globalConsumer = makeConsumer({})
			const nsConsumer = makeConsumer({ namespace: "ns1" })

			registry.register(globalConsumer)
			registry.register(nsConsumer)

			const event = makeEvent({ namespace: undefined })
			const matched = new Set(registry.match(event))

			expect(matched.has(globalConsumer)).toBe(true)
			expect(matched.has(nsConsumer)).toBe(false)
			expect(matched.size).toBe(1)
		})
	})
})
