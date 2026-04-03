import type { EventBus, OwlBrainCore } from "owlbrain-core"
import { Logger, OnEvent, OwlBrain, Script, container } from "owlbrain-core"
import type { AlertEvent } from "./types"

let owlbrain: OwlBrainCore | undefined
const logger = new Logger(["example", "iot"])

/**
 * Practical example
 *
 * The system simulates real‑world IoT monitoring:
 * > Sensors produce data, anomalies are detected over time, alerts escalate,
 * > and the system performs an automated shutdown when conditions become unsafe.
 *
 *  You can run this example with `npm run example sensors`
 */
@Script()
class ShutdownScript {
	private logger = logger.child(["shutdown"])
	private alertsCount = 0

	@OnEvent("alert")
	async onAlert(event: AlertEvent) {
		this.logger.fatal("Alert received, stopping server")
		owlbrain?.stop()
	}
}

async function main() {
	owlbrain = await OwlBrain.withScriptsPath(
		"./examples/practical/sensors/*.script.ts"
	)
		.withLoggerLevel(
			// We filter the sensor reading logs since they are verbose.
			// You can re-enable them
			"example.iot.sensor",
			"WARN"
		)
		.start()

	logger.info("Waiting for OwlBrain to stop")
	await owlbrain.wait()

	logger.info("🦉🧠")
}

main()
