import type { EventBus, OwlBrainCore } from "owlbrain-core"
import { Logger, OwlBrain, container } from "owlbrain-core"

let owlbrain: OwlBrainCore | undefined
const logger = new Logger(["example"])

/**
 * Example showing **how to load scripts dynamically**, but also:
 * - How to start OwlBrain
 * - How to do a basic listen to a event
 * - How to emit an event manually
 * - How to gracefully stop the runtime
 *
 *  You can run this example with `npm run example loading-by-path`
 * */
async function main() {
	const owlbrain = await OwlBrain.withScriptsPath(
		"./examples/features/load-by-path/*.script.ts"
	).start()

	const eventBus = container.resolve<EventBus>(["core", "eventbus"])
	logger.info("Emitting the custom event 'my-event'")
	eventBus.emit({
		name: "my-event"
	})

	logger.info("Waiting for OwlBrain to stop")
	await owlbrain.wait()

	logger.info("🦉🧠")
}

main()
