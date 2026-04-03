import type { EventBus, OwlBrainCore, OwlEvent } from "owlbrain-core"
import { Logger, OnEvent, OwlBrain, Script, container } from "owlbrain-core"

let owlbrain: OwlBrainCore | undefined
const logger = new Logger(["example"])

/**
 * Example showing **How to do a listen to an event using more complex rules**, but also:
 * - How to start OwlBrain
 * - How to emit an event manually
 * - How to gracefully stop the runtime
 *
 *  You can run this example with `npm run example advanced-event-filtering`
 */
@Script()
class AdvancedEventFilteringExample {
	private logger = logger.child(["script"])

	@OnEvent((event) => {
		return event.name.includes("d") && event.name.length > 3
	})
	async onLongEvent(event: OwlEvent) {
		this.logger.info("Received event", event.name)
		this.logger.info("We will use it to stop OwlBrain")
		owlbrain?.stop()
	}
}

async function main() {
	owlbrain = await OwlBrain.start()

	const eventBus = container.resolve<EventBus>(["core", "eventbus"])
	logger.info("Emitting our events")
	eventBus.emit({ name: "a" })
	eventBus.emit({ name: "b" })
	eventBus.emit({ name: "ccc" })
	eventBus.emit({ name: "dddd" })

	logger.info("Waiting for OwlBrain to stop")
	await owlbrain.wait()
}

main()
