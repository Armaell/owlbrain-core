import type { LifecycleHooks } from "./lifecycle"
import { LifecycleMachine, LifecycleState } from "./lifecycle"
import type { EventBus } from "../events-bus/events-bus"
import { beforeEach, describe, expect, test } from "vitest"

describe("LifecycleMachine", () => {
	let events: any[] = []
	let eventBus: EventBus

	beforeEach(() => {
		events = []
		eventBus = {
			emit: (e: any) => events.push(e)
		} as unknown as EventBus
	})

	function createComponent(label: string, calls: string[]): LifecycleHooks {
		return {
			onInit: () => {
				calls.push(`${label}.onInit`)
			},
			onStarting: () => {
				calls.push(`${label}.onStarting`)
			},
			onStarted: () => {
				calls.push(`${label}.onStarted`)
			},
			onStopping: () => {
				calls.push(`${label}.onStopping`)
			},
			onStopped: () => {
				calls.push(`${label}.onStopped`)
			}
		}
	}

	describe("Component registration", () => {
		test("registering a component immediately runs all hooks up to the current state", async () => {
			const machine = new LifecycleMachine(eventBus)
			const calls: string[] = []

			await machine.transition(LifecycleState.Starting)
			await machine.transition(LifecycleState.Started)

			const component = createComponent("A", calls)

			await machine.register(component)

			expect(calls).toEqual(["A.onInit", "A.onStarting", "A.onStarted"])
		})
	})

	describe("State transitions", () => {
		test("transitioning triggers the corresponding hook on all registered components", async () => {
			const machine = new LifecycleMachine(eventBus)
			const calls: string[] = []

			const A = createComponent("A", calls)
			const B = createComponent("B", calls)

			await machine.register(A)
			await machine.register(B)

			await machine.transition(LifecycleState.Starting)
			await machine.transition(LifecycleState.Started)

			expect(calls).toEqual([
				"A.onInit",
				"B.onInit",
				"A.onStarting",
				"B.onStarting",
				"A.onStarted",
				"B.onStarted"
			])
		})

		test("invalid transitions throw an error", async () => {
			const machine = new LifecycleMachine(eventBus)

			await expect(machine.transition(LifecycleState.Started)).rejects.toThrow(
				"Invalid transition: Init → Started"
			)
		})
	})

	describe("Event emission", () => {
		test("events are emitted for each transition", async () => {
			const machine = new LifecycleMachine(eventBus)

			await machine.transition(LifecycleState.Starting)
			await machine.transition(LifecycleState.Started)

			expect(events).toEqual([
				{
					namespace: "core.lifecycle",
					name: LifecycleState.Starting.toLowerCase()
				},
				{
					namespace: "core.lifecycle",
					name: LifecycleState.Started.toLowerCase()
				}
			])
		})
	})

	describe("State assertion", () => {
		test("is() asserts the current state", async () => {
			const machine = new LifecycleMachine(eventBus)

			await machine.transition(LifecycleState.Starting)

			expect(() => machine.shouldBe(LifecycleState.Starting)).not.toThrow()
			expect(() => machine.shouldBe(LifecycleState.Started)).toThrow()
		})
	})
})
