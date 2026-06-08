import type { EventsConsumer } from "./consumer"
import type { EmitOwlEvent, EventsListener, OwlEvent } from "./events-bus"

export class EventBusHarness {
	private listeners: (EventsConsumer<any> | EventsListener<any>)[] = []
	public emitted: OwlEvent[] = []

	public listen<TEvent extends OwlEvent = OwlEvent>(
		listener: EventsConsumer<TEvent> | EventsListener<TEvent>
	) {
		this.listeners.push(listener)
	}

	async emit<TEvent extends OwlEvent>(
		event: EmitOwlEvent<TEvent>
	): Promise<void> {
		const eventWithDate: TEvent = {
			...event,
			datetime: event.datetime ?? new Date()
		} as TEvent

		this.emitted.push(eventWithDate)

		const eventMatchNamespace = (consumer: EventsConsumer) =>
			!consumer.namespace || consumer.namespace === eventWithDate.namespace
		const eventMatchEventName = (consumer: EventsConsumer) =>
			!consumer.eventName || consumer.eventName === eventWithDate.name
		const eventMatchEventFilter = (consumer: EventsConsumer) =>
			!consumer.eventFilter || consumer.eventFilter(eventWithDate)

		const remainingListeners: typeof this.listeners = []

		for (const listener of this.listeners) {
			if (typeof listener === "function") {
				await listener(eventWithDate)
				remainingListeners.push(listener)
			} else {
				const consumer = listener

				if (
					!eventMatchNamespace(consumer) ||
					!eventMatchEventName(consumer) ||
					!eventMatchEventFilter(consumer)
				) {
					remainingListeners.push(consumer)
					continue
				}

				await consumer.method(eventWithDate)

				if (!consumer.once) {
					remainingListeners.push(consumer)
				}
			}
		}

		this.listeners = remainingListeners
	}

	reset(): void {
		this.emitted = []
		this.listeners = []
	}
}
