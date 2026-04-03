import type { EventBus, OwlBrainCore, OwlEvent } from "owlbrain-core"
import {
	Delay,
	Logger,
	OnEvent,
	OwlBrain,
	Script,
	container
} from "owlbrain-core"

let owlbrain: OwlBrainCore | undefined
const logger = new Logger(["example"])

/**
 * Basic example showing **how to delay a method call**, but also:
 * - How to start OwlBrain
 * - How to do a basic listen to a event
 * - How to emit an event manually
 * - How to gracefully stop the runtime
 *
 * You can run this example with `npm run example basic`
 */
@Script()
class BasicExample {
	private logger = logger.child(["script"])

	private firstEventAt: number | null = null

	@OnEvent("my-event")
	async onEvent(event: OwlEvent) {
		this.firstEventAt = Date.now()
		this.logger.info("Received event", event.name)
	}

	@OnEvent("my-event")
	@Delay(5_000)
	async onDelayedEvent(event: OwlEvent) {
		const now = Date.now()

		if (this.firstEventAt) {
			const diff = now - this.firstEventAt
			this.logger.info(`Received event ${event.name} too, but ${diff} ms later`)
		} else {
			throw new Error("Received the event first ??")
		}

		this.logger.info("We will use it to stop OwlBrain")
		owlbrain?.stop()
	}
}

async function main() {
	owlbrain = await OwlBrain.start()

	const eventBus = container.resolve<EventBus>(["core", "eventbus"])
	logger.info("Emitting the custom event 'my-event'")
	await eventBus.emit({
		name: "my-event"
	})

	logger.info("Waiting for OwlBrain to stop")
	await owlbrain.wait()

	logger.info("🦉🧠")
}

main()
