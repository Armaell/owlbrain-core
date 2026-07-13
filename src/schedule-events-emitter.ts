import {
	type LifecycleHooks,
	type LifecycleMachine,
	LifecycleState
} from "./core/lifecycle"
import type { EventBus } from "./events-bus/events-bus"
import later from "later"

interface LaterTimer {
	clear: () => void
}

/**
 * Snap a `Date` to the nearest whole second.
 *
 * `later.setInterval` invokes its callback at (approximately) the scheduled second, a few milliseconds early or late.
 * Rounding to the nearest second clear that sub-second jitter.
 */
function snapToSecond(date: Date): Date {
	return new Date(Math.round(date.getTime() / 1000) * 1000)
}

/**
 * Centralize cron-"jobs" events.
 * @Schedule event decorators request the schedules of events they need to be emitted
 */
export class ScheduleEventsEmitter implements LifecycleHooks {
	private fullSchedule: later.ScheduleData = {
		schedules: [],
		exceptions: [],
		error: 0
	}
	private timer: LaterTimer | undefined

	constructor(
		private eventBus: EventBus,
		private lifecycle: LifecycleMachine
	) {}

	schedule(schedule: later.ScheduleData) {
		this.fullSchedule.schedules.push(...schedule.schedules)
		this.refreshEmittedEvents()
	}

	onStarted(): void | Promise<void> {
		this.refreshEmittedEvents()
	}

	private refreshEmittedEvents() {
		if (this.lifecycle.state !== LifecycleState.Started) return
		this.timer?.clear()
		this.timer = later.setInterval(() => void this.emit(), this.fullSchedule)
	}

	private async emit() {
		const scheduledFor = snapToSecond(new Date())
		await this.eventBus.emit({
			namespace: "core.schedule",
			name: scheduledFor.toISOString(),
			datetime: scheduledFor
		})
	}

	onStopping(): void {
		this.timer?.clear()
	}
}
