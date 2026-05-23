import { Logger } from "../logging/logger"
import type {
	EmitOwlEvent,
	EventBus,
	EventsListener,
	OwlEvent
} from "./events-bus"

export class InMemoryEventBus implements EventBus {
	private logger = new Logger(["core", "eventbus"])
	private listeners: EventsListener[] = []

	async emit<TEvent extends OwlEvent = OwlEvent>(
		event: EmitOwlEvent<TEvent>
	): Promise<void> {
		this.logger.debug(`${event.namespace ?? ""}/${event.name}`)
		const completeEvent = {
			datetime: new Date(),
			...event
		} as TEvent

		for (const listener of this.listeners) {
			try {
				await listener(completeEvent)
			} catch (err) {
				this.logger.error(err)
			}
		}
	}

	listen<TEvent extends OwlEvent = OwlEvent>(handler: EventsListener<TEvent>) {
		this.listeners.push(handler as EventsListener<OwlEvent>)
	}
}
