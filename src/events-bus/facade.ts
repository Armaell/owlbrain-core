import type { EventBusConsumer, EventsConsumer } from "./consumer"
import type { EmitOwlEvent, EventBus, OwlEvent } from "./events-bus"

export class EventBusFacade {
	// Hide the split of EventBus/EventBusConsumer to public users

	constructor(
		private eventBus: EventBus,
		private consumer: EventBusConsumer
	) {}

	public async emit<
		TEvent extends EmitOwlEvent<OwlEvent> = EmitOwlEvent<OwlEvent>
	>(event: TEvent) {
		await this.eventBus.emit(event)
	}

	public listen<TEvent extends OwlEvent = OwlEvent>(
		consumer: EventsConsumer<TEvent>
	) {
		this.consumer.register(consumer)
	}
}
