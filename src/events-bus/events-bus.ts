export interface OwlEvent {
	namespace?: string
	name: string
	datetime: Date
}

export type EmitOwlEvent<TEvent extends OwlEvent> = Omit<TEvent, "datetime"> &
	Partial<Pick<TEvent, "datetime">>

export type EventsListener<TEvent extends OwlEvent = OwlEvent> = (
	event: TEvent
) => Promise<void> | void

/**
 * Simple event bus\
 * All events are emitted to all listeners in a blocking fashion
 */
export interface EventBus {
	emit<TEvent extends OwlEvent = OwlEvent>(
		event: EmitOwlEvent<TEvent>
	): Promise<void>
	listen<TEvent extends OwlEvent = OwlEvent>(
		handler: EventsListener<TEvent>
	): void
}
