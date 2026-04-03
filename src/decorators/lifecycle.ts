import type { OwlEvent } from "../events-bus/events-bus"
import { buildEventDecorator } from "./builders/event"

export const OnInit = buildEventDecorator(
	(method: (event: OwlEvent) => Promise<void>, scriptData: unknown) => {
		return {
			method,
			eventNamespace: "core.lifecycle",
			eventName: "init"
		}
	}
)

export const OnStart = buildEventDecorator(
	(method: (event: OwlEvent) => Promise<void>, scriptData: unknown) => {
		return {
			method,
			eventNamespace: "core.lifecycle",
			eventName: "started"
		}
	}
)

export const OnStop = buildEventDecorator(
	(method: (event: OwlEvent) => Promise<void>, scriptData: unknown) => {
		return {
			method,
			eventNamespace: "core.lifecycle",
			eventName: "stopping"
		}
	}
)
