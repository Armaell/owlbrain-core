import type { EventsConsumer } from "./consumer"
import type { OwlEvent } from "./events-bus"

/**
 * Store EventsConsumer for quick retrieval by namespace
 */
export class ConsumerRegistry {
	private consumers = new Map<string | undefined, Set<EventsConsumer>>()
	private cachedMatches = new Map<string | undefined, EventsConsumer[]>()

	/**
	 * Register a new consumer in the registry.
	 *
	 * @remarks
	 * - Consumers are grouped by their namespace.
	 * - Adding a consumer invalidates cached match results for that namespace.
	 */
	register(consumer: EventsConsumer) {
		const ns = consumer.namespace

		let set = this.consumers.get(ns)
		if (!set) {
			set = new Set()
			this.consumers.set(ns, set)
		}
		set.add(consumer)

		this.clearRelatedCaches(ns)
	}

	/**
	 * Unregister a consumer from the registry.
	 *
	 * @remarks
	 * - If the namespace becomes empty, it is removed entirely.
	 * - Cache entries related to the namespace are invalidated.
	 * */
	unregister(consumer: EventsConsumer) {
		const ns = consumer.namespace

		const set = this.consumers.get(ns)
		if (!set) return

		set.delete(consumer)

		if (set.size === 0) {
			this.consumers.delete(ns)
		}

		this.clearRelatedCaches(ns)
	}

	private clearRelatedCaches(ns?: string) {
		this.cachedMatches.delete(ns)

		if (ns === undefined) {
			this.cachedMatches.clear()
		}
	}

	/**
	 * Retrieve all consumers matching the given event.
	 * @param event - The event used to determine matching consumers.
	 * @returns An array of consumers that should receive the event.
	 *
	 * @remarks * Matching rules:
	 * - If the event has **no namespace** it returns:
	 * - - Consumers registered with no namespaces
	 * - If the event has a namespace it returns:
	 * - - Consumers registered under that namespace
	 * - - Consumers registered with no namespaces
	 *
	 * Results are cached per namespace for fast repeated lookups.
	 */
	match<TEvent extends OwlEvent = OwlEvent>(
		event: TEvent
	): EventsConsumer<TEvent>[] {
		const ns = event.namespace

		const cached = this.cachedMatches.get(ns)
		if (cached) return cached

		let result: EventsConsumer<TEvent>[]

		// No namespace → return all consumers
		if (!ns) {
			// No namespace → only global
			const global = this.consumers.get(undefined) ?? []
			result = [...global]
		} else {
			// Namespaced → global + scoped
			const global = this.consumers.get(undefined) ?? []
			const scoped = this.consumers.get(ns) ?? []
			result = [...global, ...scoped]
		}

		this.cachedMatches.set(ns, result)
		return result
	}
}
