import type { OwlEvent } from "owlbrain-core"

export type SensorType = "temperature" | "humidity"

export const SENSOR_UNITS: Record<SensorType, string> = {
	temperature: "°C",
	humidity: "%"
}

export interface SensorReadingEvent extends OwlEvent {
	name: "sensor-reading"
	sensorId: string
	type: SensorType
	value: number
	unit: string
}

export interface TemperatureHighEvent extends OwlEvent {
	name: "temperature-high"
	sensorId: string
	value: number
}

export interface AlertEvent extends OwlEvent {
	name: "alert"
	message: string
}
