import type { EventBus } from "owlbrain-core"
import { Inject, Logger, OnEvent, OnlyIf, Script } from "owlbrain-core"
import type { SensorReadingEvent, TemperatureHighEvent } from "./types"

@Script()
class TemperatureFilterScript {
	private logger = new Logger(["example", "iot", "temp-filter"])
	private highSince = new Map<string, number>() // sensorId → timestamp (ms)
	readonly THRESHOLD = 30
	readonly DURATION = 10_000

	@Inject(["core", "eventbus"])
	private eventBus: EventBus!

	@OnEvent((event) => event.name === "sensor-reading")
	@OnlyIf((event) => event.type === "temperature")
	@OnlyIf((event, script) => event.value > script.THRESHOLD)
	async onHighSensorReading(event: SensorReadingEvent) {
		const now = Date.now()
		if (!this.highSince.has(event.sensorId)) {
			// First high reading
			this.highSince.set(event.sensorId, now)
			this.logger.warn(
				"High temperature started on",
				event.sensorId,
				"value:",
				event.value,
				event.unit
			)
		} else {
			// Already high — check duration
			const started = this.highSince.get(event.sensorId)!
			if (now - started >= this.DURATION) {
				this.logger.warn(
					"Sustained high temperature detected on",
					event.sensorId,
					"value:",
					event.value,
					event.unit
				)

				// Emit sustained high temp event
				await this.eventBus.emit<TemperatureHighEvent>({
					name: "temperature-high",
					sensorId: event.sensorId,
					value: event.value,
					datetime: new Date()
				})

				// Prevent repeated alerts
				this.highSince.delete(event.sensorId)
			}
		}
	}

	/**
	 * Temperature returned to normal
	 */
	@OnEvent((event) => event.name === "sensor-reading")
	@OnlyIf((event) => event.type === "temperature")
	@OnlyIf((event, script) => event.value <= script.THRESHOLD)
	async onNormalSensorReading(event: SensorReadingEvent) {
		if (this.highSince.has(event.sensorId)) {
			this.logger.info(
				"Temperature normalized on",
				event.sensorId,
				"value:",
				event.value,
				event.unit
			)
		}
		this.highSince.delete(event.sensorId)
	}
}
