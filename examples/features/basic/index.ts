import type { EventBus, OwlBrainCore, OwlEvent } from "owlbrain-core"
import { Logger, OnEvent, OwlBrain, Script, container } from "owlbrain-core"

let owlbrain: OwlBrainCore | undefined
const logger = new Logger(["example"])

/**
 * Basic example showing:
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

	@OnEvent("my-event")
	async onEvent(event: OwlEvent) {
		this.logger.info("Received event", event.name)
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
