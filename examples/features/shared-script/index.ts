import type { EventBus, OwlBrainCore, OwlEvent } from "owlbrain-core"
import { Logger, OnEvent, OwlBrain, Script, container } from "owlbrain-core"

let owlbrain: OwlBrainCore | undefined
const logger = new Logger(["example"])

/**
 * Example showing **that we can extend a class with event decorators**
 * and **that we can have multiple instances of a single script**, but also:
 * - How to start OwlBrain
 * - How to emit an event manually
 * - How to gracefully stop the runtime
 *
 * You can run this example with `npm run example shared-script`
 */
class BaseScriptExample {
	private static instanceCounter = 0
	protected instanceId: number
	protected logger: Logger

	constructor() {
		this.instanceId = ++SharedScriptExample.instanceCounter
		this.logger = logger.child(["script", this.instanceId.toString()])
		this.logger.info(`Created instance #${this.instanceId}`)
	}

	@OnEvent("my-event")
	async onPing(event: OwlEvent) {
		this.logger.info(
			`Instance #${this.instanceId} received event '${event.name}'`
		)
	}
}

@Script()
@Script()
class SharedScriptExample extends BaseScriptExample {
	private static received = 0

	override async onPing(event: OwlEvent) {
		super.onPing(event)
		SharedScriptExample.received += 1

		if (SharedScriptExample.received === 2) {
			this.logger.info(
				`Both instances received the event, we now stop OwlBrain`
			)
			owlbrain?.stop()
		}
	}
}

async function main() {
	owlbrain = await OwlBrain.withLoggerLevel("", "DEBUG").start()

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
