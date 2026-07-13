import later from "later"
import type { OwlEvent } from "../events-bus/events-bus"
import { buildEventDecorator } from "../integration"
import { container } from "../di/container"
import type { ScheduleEventsEmitter } from "../schedule-events-emitter"
import { InvalidScheduleError } from "../errors"

later.date.localTime()

type BreeLaterSchedule = {
	isValid: (d: Date) => boolean
	next: (count?: number) => Date | Date[]
	prev: (count?: number) => Date | Date[]
}

export const Schedule = {
	/**
	 * Schedule a method using natural‑language.
	 *
	 * More details at https://breejs.github.io/later/parsers.html#text
	 *
	 * @example
	 * - `"every 5 minutes"`
	 * - `"every day at 3pm"`
	 * - `"every Monday and Friday at 09:30"`
	 *
	 * @example
	 * ```ts
	 *.@Schedule.text("every 10 minutes")
	 * async clearCache(event: OwlEvent) {
	 * 	//
	 * }
	 * ```
	 */
	text: buildEventDecorator(
		(
			method: (event: OwlEvent) => Promise<void>,
			scriptData: unknown,
			textSchedule: string
		) => {
			const scheduler = container.resolve<ScheduleEventsEmitter>([
				"core",
				"scheduler"
			])

			const parsed = later.parse.text(textSchedule)
			if (parsed.error >= 0) {
				throw new InvalidScheduleError({
					type: "text",
					text: textSchedule
				})
			}

			scheduler.schedule(parsed)

			const laterSchedule = later.schedule(
				parsed
			) as unknown as BreeLaterSchedule

			return {
				method,
				eventNamespace: "core.schedule",
				eventFilter: (event: OwlEvent) => laterSchedule.isValid(event.datetime)
			}
		}
	),

	/**
	 * Schedule a method using a 6‑field cron expression.
	 *
	 * @example
	 * - `"0 0 3 * * *"` → every day at 03:00
	 * - `"0 30 9 * * 1,5"` → Mondays and Fridays at 09:30
	 *
	 * @example
	 * ```ts
	 * .@Schedule.cron("0 0 1 * * *")
	 * async generateDailyReport(event: OwlEvent) {
	 * 	//
	 * }
	 * ```
	 */
	cron: buildEventDecorator(
		(
			method: (event: OwlEvent) => Promise<void>,
			scriptData: unknown,
			cronSchedule: string
		) => {
			const scheduler = container.resolve<ScheduleEventsEmitter>([
				"core",
				"scheduler"
			])

			const parsed = later.parse.cron(cronSchedule, true)
			if (parsed.error >= 0) {
				throw new InvalidScheduleError({
					type: "cron",
					text: cronSchedule
				})
			}

			scheduler.schedule(parsed)

			const laterSchedule = later.schedule(
				parsed
			) as unknown as BreeLaterSchedule

			return {
				method,
				eventNamespace: "core.schedule",
				eventFilter: (event: OwlEvent) => laterSchedule.isValid(event.datetime)
			}
		}
	)
}
