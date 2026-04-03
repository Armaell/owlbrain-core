import type { EventBus } from "../events-bus/events-bus"
import { IncorrectStateError, LifecycleTransitionError } from "../errors"
import { Logger } from "../logging/logger"

export enum LifecycleState {
	Init = "Init",
	Starting = "Starting",
	Started = "Started",
	Stopping = "Stopping",
	Stopped = "Stopped"
}

export interface LifecycleHooks {
	onInit?(): void | Promise<void>
	onStarting?(): void | Promise<void>
	onStarted?(): void | Promise<void>
	onStopping?(): void | Promise<void>
	onStopped?(): void | Promise<void>
}

/**
 * Basic state machine to run integrations lifecycle hooks (onInit, onStarting, …).
 */
export class LifecycleMachine {
	private logger = new Logger(["core", "lifecycle"])

	private currentState = LifecycleState.Init
	private components: LifecycleHooks[] = []
	private readonly transitions: Record<LifecycleState, LifecycleState[]> = {
		[LifecycleState.Init]: [LifecycleState.Starting],
		[LifecycleState.Starting]: [LifecycleState.Started],
		[LifecycleState.Started]: [LifecycleState.Stopping],
		[LifecycleState.Stopping]: [LifecycleState.Stopped],
		[LifecycleState.Stopped]: []
	}
	public readonly order = [
		LifecycleState.Init,
		LifecycleState.Starting,
		LifecycleState.Started,
		LifecycleState.Stopping,
		LifecycleState.Stopped
	]

	constructor(private eventBus: EventBus) {}

	/**
	 * Registers a component that implements lifecycle hooks.
	 *
	 * If the machine has already progressed past some lifecycle states,
	 * the component will immediately receive all hooks up to the current state.
	 */
	async register(component: LifecycleHooks) {
		this.components.push(component)

		// Call all hooks up to the current state
		const currentIndex = this.order.indexOf(this.state)
		for (let i = 0; i <= currentIndex; i++) {
			const state = this.order[i]
			const hookName = ("on" + state) as keyof LifecycleHooks

			await component[hookName]?.()
		}
	}

	get state(): LifecycleState {
		return this.currentState
	}

	async transition(next: LifecycleState) {
		const allowed = this.transitions[this.state] ?? []
		if (!allowed.includes(next)) {
			throw new Error(`Invalid transition: ${this.state} → ${next}`)
		}

		const fromState = this.currentState
		try {
			this.currentState = next
			await this.eventBus.emit({
				namespace: "core.lifecycle",
				name: next.toLocaleLowerCase()
			})

			const hookName = ("on" + next) as keyof LifecycleHooks
			await Promise.all(this.components.map((c) => c[hookName]?.()))
		} catch (err) {
			throw new LifecycleTransitionError({
				from: fromState,
				to: next,
				cause: err,
				namespace: this.logger.namespace
			})
		}
	}

	/**
	 * @throws *IncorrectStateError* when the current state does not match the expected one.
	 */
	shouldBe(state: LifecycleState) {
		if (this.currentState !== state) {
			throw new IncorrectStateError({
				namespace: this.logger.namespace,
				expected: state,
				current: this.currentState
			})
		}
	}
}
