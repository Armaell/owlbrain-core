import type { OwlBrainCore, OwlEvent } from "owlbrain-core"
import { Logger, OwlBrain, Schedule, Script } from "owlbrain-core"

let owlbrain: OwlBrainCore | undefined
const logger = new Logger(["example"])

/**
 * Basic example showing **how to use the schedule decorator**, but also:
 * - How to start OwlBrain
 * - How to gracefully stop the runtime
 *
 * You can run this example with `npm run example basic`
 */
@Script()
class BasicExample {
	private logger = logger.child(["script"])

	@Schedule.text("every 5 s")
	async onEvery5Seconds(event: OwlEvent) {
		this.logger.info("This is called every 5 seconds")
	}

	@Schedule.cron("0 */1 * * * *")
	async onEveryMinute(event: OwlEvent) {
		this.logger.info("This is called every minute")
		owlbrain?.stop()
	}
}

async function main() {
	owlbrain = await OwlBrain.start()

	logger.info("Waiting for OwlBrain to stop")
	await owlbrain.wait()

	logger.info("🦉🧠")
}

main()
