import {
	type LifecycleHooks,
	type LifecycleMachine,
	LifecycleState
} from "./core/lifecycle"
import type { EventBus } from "./events-bus/events-bus"
import later from "later"

type LaterSchedule = {
	schedules: Record<string, number[]>[]
}

interface LaterTimer {
	clear: () => void
}

/**
 * Centralize cron-"jobs" events.
 * @Schedule event decorators request the schedules of events they need to be emitted
 */
export class ScheduleEventsEmitter implements LifecycleHooks {
	private fullSchedule: LaterSchedule = { schedules: [] }
	private timer: LaterTimer | undefined

	constructor(
		private eventBus: EventBus,
		private lifecycle: LifecycleMachine
	) {}

	schedule(schedule: LaterSchedule) {
		this.fullSchedule.schedules.push(...schedule.schedules)
		this.refreshEmittedEvents()
	}

	onStarted(): void | Promise<void> {
		this.refreshEmittedEvents()
	}

	private refreshEmittedEvents() {
		if (this.lifecycle.state !== LifecycleState.Started) return
		this.timer?.clear()
		this.timer = later.setInterval(() => this.emit(), this.fullSchedule)
	}

	private async emit() {
		const date = new Date()
		await this.eventBus.emit({
			namespace: "core.schedule",
			name: date.toUTCString()
		})
	}

	onStopping(): void {
		this.timer?.clear()
	}
}
