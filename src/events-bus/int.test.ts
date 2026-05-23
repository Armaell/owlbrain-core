import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from "vitest"

import { EventBusConsumer } from "./consumer"
import { InMemoryEventBus } from "./in-memory-event-bus"
import type { OwlEvent } from "./events-bus"
import { LifecycleState } from "../core/lifecycle"
import { Logger } from "../logging/logger"

type MockLifecycleMachine = {
	state: LifecycleState
	shouldBe: ReturnType<typeof vi.fn>
}

function createLifecycle(
	initialState: LifecycleState = LifecycleState.Started
): MockLifecycleMachine {
	return {
		state: initialState,
		shouldBe: vi.fn()
	}
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitFor(assertion: () => void, timeout = 3000, interval = 10) {
	const start = Date.now()

	while (Date.now() - start < timeout) {
		try {
			assertion()
			return
		} catch {
			await sleep(interval)
		}
	}

	assertion()
}

describe("Event-bus system", () => {
	let eventBus: InMemoryEventBus
	let lifecycle: MockLifecycleMachine
	let consumer: EventBusConsumer

	beforeAll(() => {
		Logger.levels.setDefault("MUTE")
	})

	beforeEach(() => {
		eventBus = new InMemoryEventBus()
		lifecycle = createLifecycle()
	})

	afterEach(async () => {
		if (consumer) {
			lifecycle.state = LifecycleState.Stopping
			await consumer.stop()
		}
	})

	it("delivers events to matching global consumers", async () => {
		const received: string[] = []

		consumer = new EventBusConsumer(eventBus, lifecycle as any, 2)

		consumer.register({
			method: (event) => {
				received.push(event.name)
			}
		})

		await eventBus.emit({ name: "event-1" })
		await eventBus.emit({ name: "event-2" })

		await waitFor(() => {
			expect(received).toEqual(["event-1", "event-2"])
		})
	})

	it("routes namespaced events to global + matching namespace consumers only", async () => {
		const globalReceived: string[] = []
		const alphaReceived: string[] = []
		const betaReceived: string[] = []

		consumer = new EventBusConsumer(eventBus, lifecycle as any, 3)

		consumer.register({
			method: (event) => globalReceived.push(event.name)
		})

		consumer.register({
			namespace: "alpha",
			method: (event) => alphaReceived.push(event.name)
		})

		consumer.register({
			namespace: "beta",
			method: (event) => betaReceived.push(event.name)
		})

		await eventBus.emit({ namespace: "alpha", name: "a1" })
		await eventBus.emit({ namespace: "beta", name: "b1" })
		await eventBus.emit({ name: "global-only" })

		await waitFor(() => {
			expect(globalReceived).toEqual(["a1", "b1", "global-only"])
			expect(alphaReceived).toEqual(["a1"])
			expect(betaReceived).toEqual(["b1"])
		})
	})

	it("supports eventName filtering", async () => {
		const received: string[] = []

		consumer = new EventBusConsumer(eventBus, lifecycle as any)

		consumer.register({
			eventName: "target",
			method: (event) => received.push(event.name)
		})

		await eventBus.emit({ name: "ignore-1" })
		await eventBus.emit({ name: "target" })
		await eventBus.emit({ name: "ignore-2" })

		await waitFor(() => {
			expect(received).toEqual(["target"])
		})
	})

	it("supports eventFilter predicates", async () => {
		const received: string[] = []

		consumer = new EventBusConsumer(eventBus, lifecycle as any)

		consumer.register({
			eventFilter: (event) => event.name.startsWith("pass"),
			method: (event) => received.push(event.name)
		})

		await eventBus.emit({ name: "pass-1" })
		await eventBus.emit({ name: "fail-1" })
		await eventBus.emit({ name: "pass-2" })

		await waitFor(() => {
			expect(received).toEqual(["pass-1", "pass-2"])
		})
	})

	it("unregisters `once` consumers after first execution", async () => {
		const received: string[] = []

		consumer = new EventBusConsumer(eventBus, lifecycle as any)

		consumer.register({
			once: true,
			method: (event) => received.push(event.name)
		})

		await eventBus.emit({ name: "first" })

		await waitFor(() => {
			expect(received).toEqual(["first"])
		})

		await eventBus.emit({ name: "second" })

		await sleep(50)

		expect(received).toEqual(["first"])
	})

	it("serializes tasks sharing the same concurrencyKey", async () => {
		const key = Symbol("serial")
		const executionOrder: string[] = []
		let concurrentCount = 0
		let maxConcurrent = 0

		consumer = new EventBusConsumer(eventBus, lifecycle as any, 4)

		consumer.register({
			concurrencyKey: key,
			method: async (event) => {
				concurrentCount++
				maxConcurrent = Math.max(maxConcurrent, concurrentCount)

				executionOrder.push(`start-${event.name}`)
				await sleep(40)
				executionOrder.push(`end-${event.name}`)

				concurrentCount--
			}
		})

		await eventBus.emit({ name: "1" })
		await eventBus.emit({ name: "2" })
		await eventBus.emit({ name: "3" })

		await waitFor(() => {
			expect(executionOrder).toEqual([
				"start-1",
				"end-1",
				"start-2",
				"end-2",
				"start-3",
				"end-3"
			])
			expect(maxConcurrent).toBe(1)
		})
	})

	it("allows parallel execution for different concurrency keys", async () => {
		const started: string[] = []
		const finished: string[] = []

		consumer = new EventBusConsumer(eventBus, lifecycle as any, 4)

		consumer.register({
			eventFilter: (e) => e.namespace === "a",
			concurrencyKey: Symbol.for("a"),
			method: async () => {
				started.push("a")
				await sleep(80)
				finished.push("a")
			}
		})

		consumer.register({
			eventFilter: (e) => e.namespace === "b",
			concurrencyKey: Symbol.for("b"),
			method: async () => {
				started.push("b")
				await sleep(80)
				finished.push("b")
			}
		})

		await Promise.all([
			eventBus.emit({ namespace: "a", name: "one" }),
			eventBus.emit({ namespace: "b", name: "two" })
		])

		await waitFor(() => {
			expect(started).toContain("a")
			expect(started).toContain("b")
			expect(finished).toContain("a")
			expect(finished).toContain("b")
		})

		const firstTwo = started.slice(0, 2).sort()
		expect(firstTwo).toEqual(["a", "b"])
	})

	it("continues processing when a consumer throws", async () => {
		const success: string[] = []

		consumer = new EventBusConsumer(eventBus, lifecycle as any, 2)

		consumer.register({
			method: () => {
				throw new Error("boom")
			}
		})

		consumer.register({
			method: (event) => {
				success.push(event.name)
			}
		})

		await eventBus.emit({ name: "safe-event" })

		await waitFor(() => {
			expect(success).toEqual(["safe-event"])
		})
	})

	it("skips events emitted after stopping except stopping event already queued before state change", async () => {
		const received: string[] = []

		consumer = new EventBusConsumer(eventBus, lifecycle as any)

		consumer.register({
			method: (event) => {
				received.push(event.name)
			}
		})

		await eventBus.emit({ name: "before-stop" })

		lifecycle.state = LifecycleState.Stopping

		await eventBus.emit({ name: "ignored-after-stop" })

		await waitFor(() => {
			expect(received).toEqual(["before-stop"])
		})
	})

	it("drains running tasks during stop()", async () => {
		const completed: string[] = []

		consumer = new EventBusConsumer(eventBus, lifecycle as any, 2)

		consumer.register({
			method: async (event) => {
				await sleep(100)
				completed.push(event.name)
			}
		})

		await eventBus.emit({ name: "task-1" })
		await eventBus.emit({ name: "task-2" })

		lifecycle.state = LifecycleState.Stopping

		await consumer.stop(1000)

		expect(completed.sort()).toEqual(["task-1", "task-2"])
	})

	it("wait() resolves after workers complete", async () => {
		const completed: string[] = []

		consumer = new EventBusConsumer(eventBus, lifecycle as any, 1)

		consumer.register({
			method: async (event) => {
				await sleep(30)
				completed.push(event.name)
			}
		})

		await eventBus.emit({ name: "one" })

		lifecycle.state = LifecycleState.Stopping

		await consumer.stop()
		await consumer.wait()

		expect(completed).toEqual(["one"])
		expect(lifecycle.shouldBe).toHaveBeenCalledWith(LifecycleState.Started)
	})

	it("preserves FIFO ordering for same-key events under load", async () => {
		const key = Symbol("fifo")
		const output: number[] = []

		consumer = new EventBusConsumer(eventBus, lifecycle as any, 8)

		consumer.register({
			concurrencyKey: key,
			method: async (event: OwlEvent) => {
				output.push(Number(event.name))
				await sleep(5)
			}
		})

		for (let i = 0; i < 20; i++) {
			await eventBus.emit({ name: `${i}` })
		}

		await waitFor(() => {
			expect(output).toHaveLength(20)
			expect(output).toEqual([...Array(20).keys()])
		})
	})
})
