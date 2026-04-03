import type { OwlBrainCore, OwlEvent } from "owlbrain-core"
import {
	Logger,
	OnInit,
	OnStart,
	OnStop,
	OwlBrain,
	Script
} from "owlbrain-core"

let owlbrain: OwlBrainCore | undefined
const logger = new Logger(["example"])

/**
 * Lifecycle example showing **how to listen to OwlBrain lifecycle events**, but also:
 * - How to start OwlBrain
 * - How to gracefully stop the runtime
 *
 * You can run this example with `npm run example lifecycle`
 */
@Script()
class LifecycleExample {
	private logger = logger.child(["script"])

	@OnInit()
	async onInit(event: OwlEvent) {
		this.logger.info("Received event", event.name)
	}

	@OnStart()
	async onStart(event: OwlEvent) {
		this.logger.info("Received event", event.name)
		this.logger.info("We will use it to stop OwlBrain right away")
		owlbrain?.stop()
	}

	@OnStop()
	async onStop(event: OwlEvent) {
		this.logger.info("Received event", event.name)
	}
}

async function main() {
	owlbrain = await OwlBrain.start()

	logger.info("Waiting for OwlBrain to stop")
	await owlbrain.wait()

	logger.info("🦉🧠")
}

main()
