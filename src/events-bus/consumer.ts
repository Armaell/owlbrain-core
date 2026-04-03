import type { LifecycleMachine } from "../core/lifecycle"
import { LifecycleState } from "../core/lifecycle"
import { Logger } from "../logging/logger"
import { ConsumerRegistry } from "./consumer-registry"
import type { EventBus, OwlEvent } from "./events-bus"
import { KeyLockedQueue } from "./key-locked-queue"
import { WorkerPool } from "./worker-pool"

export type EventsConsumer<TEvent extends OwlEvent = OwlEvent> = {
	namespace?: string
	method: (event: TEvent, ...args: any[]) => Promise<any> | any
	/** Will trigger the method only on events passing this function */
	eventFilter?: (event: TEvent) => boolean
	/** Will trigger the method only on events with this name */
	eventName?: string
	once?: boolean
	concurrencyKey?: symbol
}

export type EventTask<TEvent extends OwlEvent = OwlEvent> = {
	consumer: EventsConsumer<TEvent>
	event: TEvent
}

/**
 * Orchestrate the consumption of event to execute events methods handlers.\
 * While {@link EventBus} call all listeners on all events,
 * the consumer only call when the event match the rules given during the registration
 *
 * @remarks
 * Uses a promise pool to avoid blocking scripts
 */
export class EventBusConsumer {
	private logger = new Logger(["core", "eventbus", "consumer"])

	private registry = new ConsumerRegistry()
	private queue = new KeyLockedQueue<EventTask>()
	private pool: WorkerPool

	constructor(
		private eventBus: EventBus,
		private lifecycle: LifecycleMachine,
		workerCount = 1
	) {
		this.pool = new WorkerPool(
			this.lifecycle,
			this.queue,
			workerCount,
			(task) => this.executeTask(task)
		)
		this.eventBus.listen((event) => this.onNewEvent(event))
	}

	register<TEvent extends OwlEvent = OwlEvent>(
		consumer: EventsConsumer<TEvent>
	) {
		this.registry.register(consumer)
	}

	/**
	 * Wait for workers to finish (after stop())
	 */
	async wait() {
		return this.pool.wait()
	}

	/**
	 * Prevent any new task to start and let the currently running ones to complete before stopping all workers
	 * @param timeoutMs Maximum time for working to complete their task before being forcefully stopped
	 * @returns
	 */
	async stop(timeoutMs?: number) {
		return this.pool.stop(timeoutMs)
	}

	private onNewEvent<TEvent extends OwlEvent = OwlEvent>(event: TEvent) {
		const consumers = this.registry.match(event)
		consumers.forEach((consumer) => {
			this.queue.enqueue({ event, consumer }, consumer.concurrencyKey)
			this.pool.wakeWorker()
		})
	}

	private async executeTask({ consumer, event }: EventTask) {
		try {
			if (
				this.lifecycle.state === LifecycleState.Stopping &&
				event.name !== "stopping"
			)
				return

			const filterMatch = !consumer.eventFilter || consumer.eventFilter(event)
			const nameMatch = !consumer.eventName || event.name === consumer.eventName
			if (filterMatch && nameMatch) {
				await consumer.method(event)
			}
		} catch (err) {
			this.logger.error(err)
		} finally {
			if (consumer.once) this.registry.unregister(consumer)
		}
	}
}
