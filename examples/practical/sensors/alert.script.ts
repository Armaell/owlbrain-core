import type { EventBus } from "owlbrain-core"
import { Inject, Logger, OnEvent, Script } from "owlbrain-core"
import type { AlertEvent, TemperatureHighEvent } from "./types"

@Script()
class HighTempAlertScript {
	private logger = new Logger(["example", "iot", "high-temp-alert"])

	@Inject(["core", "eventbus"])
	private eventBus: EventBus!

	@OnEvent("temperature-high")
	async onSustainedHighTemp(event: TemperatureHighEvent) {
		this.logger.warn(
			"Temperature has been high for at least 10s on",
			event.sensorId,
			"value (at trigger time):",
			event.value
		)

		await this.eventBus.emit<AlertEvent>({
			name: "alert",
			message: `Sustained high temperature on ${event.sensorId}`,
			datetime: new Date()
		})
	}
}
