import type { OwlEvent } from "../events-bus/events-bus"
import { buildEventDecorator } from "./builders/event"

/**
 * Basic event decorator: listen to any event matching the given filter
 */
export const OnEvent = buildEventDecorator(
	<EVENT extends OwlEvent>(
		method: (event: EVENT) => Promise<void>,
		scriptData: unknown,
		filter: ((event: EVENT) => boolean) | string
	) => {
		return {
			method,
			eventFilter: typeof filter === "function" ? filter : undefined,
			eventName: typeof filter === "string" ? filter : undefined
		}
	}
)
