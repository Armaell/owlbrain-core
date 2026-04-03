import type { EventBus, OwlEvent } from "owlbrain-core"
import { Inject, Logger, Schedule, Script } from "owlbrain-core"
import type { SensorType } from "./types"
import { SENSOR_UNITS, type SensorReadingEvent } from "./types"

@Script()
class SensorSimulatorScript {
	private logger = new Logger(["example", "iot", "sensor"])
	private sensorIds = ["sensor-1", "sensor-2"]

	@Inject(["core", "eventbus"])
	private eventBus: EventBus!

	@Schedule.text("every 1 s")
	async onTick(event: OwlEvent) {
		for (const sensorId of this.sensorIds) {
			const type = this.randomType()
			const value = this.randomValue(type)

			this.logger.info(sensorId, type, `${value} ${SENSOR_UNITS[type]}`)

			await this.eventBus.emit<SensorReadingEvent>({
				name: "sensor-reading",
				sensorId,
				type,
				value,
				unit: SENSOR_UNITS[type],
				datetime: new Date()
			})
		}
	}

	private randomType(): SensorType {
		const types: SensorType[] = ["temperature", "humidity"]
		return types[Math.floor(Math.random() * types.length)]
	}

	private randomValue(type: SensorType): number {
		switch (type) {
			case "temperature":
				return Number((20 + Math.random() * 20).toFixed(1)) // e.g. 31.4°C
			case "humidity":
				return Math.round(30 + Math.random() * 50) // e.g. 67%
		}
	}
}
