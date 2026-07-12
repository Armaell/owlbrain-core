import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { Delay } from "./delay"
import { OnlyIf } from "./only-if"
import { container } from "../di/container"
import { InMemoryEventBus } from "../events-bus/in-memory-event-bus"
import { EventBusConsumer } from "../events-bus/consumer"
import { EventBusFacade } from "../events-bus/facade"
import { LifecycleMachine } from "../core/lifecycle"
import { Logger } from "../logging/logger"
import type { OwlEvent } from "../events-bus/events-bus"

const DELAY_MS = 30

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function makeEvent(name = "trigger"): OwlEvent {
	return { name, datetime: new Date() }
}

describe("@Delay integration", () => {
	let consumer: EventBusConsumer

	beforeAll(() => {
		Logger.levels.setDefault("MUTE")

		const eventBus = new InMemoryEventBus()
		const lifecycle = new LifecycleMachine(eventBus)
		consumer = new EventBusConsumer(eventBus, lifecycle, 2)

		if (!container.has(["core", "eventbus"])) {
			container.register(
				["core", "eventbus"],
				new EventBusFacade(eventBus, consumer)
			)
		}
	})

	afterAll(async () => {
		await consumer.stop()
	})

	it("delays the call, only running it once the timer fires", async () => {
		const calls: OwlEvent[] = []

		class NominalScript {
			@Delay(DELAY_MS)
			async foo(event: OwlEvent) {
				calls.push(event)
				return "done"
			}
		}

		const instance = new NominalScript()
		const event = makeEvent()
		const promise = instance.foo(event)

		expect(calls).toEqual([])

		await expect(promise).resolves.toBe("done")
		expect(calls).toEqual([event])
	})

	describe("Delay then @OnlyIf: the gate is re-evaluated AFTER the delay elapses", () => {
		it("runs decorated function once the gate flips true during the delay", async () => {
			const calls: OwlEvent[] = []

			class DelayThenOnlyIf {
				allowed = false

				@Delay(DELAY_MS)
				@OnlyIf((_event: OwlEvent, self: DelayThenOnlyIf) => self.allowed)
				async foo(event: OwlEvent) {
					calls.push(event)
				}
			}

			const instance = new DelayThenOnlyIf()
			const promise = instance.foo(makeEvent())

			// Flip the gate while the delay is in-flight. @OnlyIf is the innermost
			// decorator here, so it is only checked once the delay resolves, and this
			// later change should win.
			instance.allowed = true

			await promise
			expect(calls).toHaveLength(1)
		})

		it("skips decorated function when the gate flips false during the delay", async () => {
			const calls: OwlEvent[] = []

			class DelayThenOnlyIf {
				allowed = true

				@Delay(DELAY_MS)
				@OnlyIf((_event: OwlEvent, self: DelayThenOnlyIf) => self.allowed)
				async foo(event: OwlEvent) {
					calls.push(event)
				}
			}

			const instance = new DelayThenOnlyIf()
			const promise = instance.foo(makeEvent())

			instance.allowed = false

			await promise
			expect(calls).toHaveLength(0)
		})
	})

	describe("@OnlyIf then @Delay: the gate is checked BEFORE the delay is even scheduled", () => {
		it("does not schedule the decorated function when the gate is closed at call time, even if it later flips true", async () => {
			const calls: OwlEvent[] = []

			class OnlyIfThenDelay {
				allowed = false

				@OnlyIf((_event: OwlEvent, self: OnlyIfThenDelay) => self.allowed)
				@Delay(DELAY_MS)
				async foo(event: OwlEvent) {
					calls.push(event)
				}
			}

			const instance = new OnlyIfThenDelay()
			const result = instance.foo(makeEvent())

			// The gate was closed synchronously at call time, so @Delay never even ran:
			// no timer or consumer was ever scheduled.
			expect(result).toBeUndefined()

			await sleep(DELAY_MS * 2)
			expect(calls).toHaveLength(0)
		})

		it("still runs the decorated function when the gate flips false after already letting the call through", async () => {
			const calls: OwlEvent[] = []

			class OnlyIfThenDelay {
				allowed = true

				@OnlyIf((_event: OwlEvent, self: OnlyIfThenDelay) => self.allowed)
				@Delay(DELAY_MS)
				async foo(event: OwlEvent) {
					calls.push(event)
				}
			}

			const instance = new OnlyIfThenDelay()
			const promise = instance.foo(makeEvent())

			// The gate already let the call through before @Delay's timer was even
			// scheduled, so this later change no longer has anything to block.
			instance.allowed = false

			await promise
			expect(calls).toHaveLength(1)
		})
	})
})
