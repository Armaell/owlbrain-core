/* eslint-disable no-console */
import { bgRed, bold, cyan, dim, green, red, white, yellow } from "colorette"
import type { LogLevel } from "./log-levels-registry"
import { LogLevelRegistry } from "./log-levels-registry"
import { RingBuffer } from "../utils"

export type Log = {
	date: Date
	namespace: string[]
	level: LogLevel
	text: string
}

export class Logger {
	private history = new RingBuffer<Log>(1000)

	constructor(public readonly namespace: string[] = []) {}

	static readonly levels = new LogLevelRegistry()
	private static levelColor = {
		DEBUG: (msg: string) => dim(msg),
		VERBOSE: (msg: string) => cyan(msg),
		INFO: (msg: string) => green(msg),
		WARN: (msg: string) => yellow(msg),
		ERROR: (msg: string) => red(msg),
		FATAL: (msg: string) => bgRed(white(bold(msg)))
	}
	private static consoleMethod: Record<LogLevel, (msg: string) => void> = {
		DEBUG: console.debug,
		VERBOSE: console.log,
		INFO: console.info,
		WARN: console.warn,
		ERROR: console.error,
		FATAL: console.error
	}

	child(namespace: string[] = []) {
		return new Logger([...this.namespace, ...namespace])
	}

	private format(date: Date, level: LogLevel, message: string) {
		const ts = date.toISOString()

		const ns = this.namespace.length ? ` [${this.namespace.join(".")}]` : ""

		return `${ts} ${level}${ns} ${message}`
	}

	private formatUnknown(value: unknown): string {
		if (value instanceof Error) {
			return value.stack ?? value.message
		}
		if (typeof value === "string") {
			return value
		}
		try {
			return JSON.stringify(value)
		} catch {
			return String(value)
		}
	}

	private write(level: LogLevel, args: unknown[]) {
		if (!Logger.levels.shouldLog(this.namespace, level)) return

		const date = new Date()

		const text = args.map((arg) => this.formatUnknown(arg)).join(" ")
		const formatted = this.format(date, level, text)
		const colorized = Logger.levelColor[level](formatted)

		this.history.push({
			date,
			namespace: this.namespace,
			level,
			text
		})

		Logger.consoleMethod[level](colorized)
	}

	log(level: LogLevel, ...args: unknown[]) {
		this.write(level, args)
	}
	debug(...args: unknown[]) {
		this.write("DEBUG", args)
	}
	verbose(...args: unknown[]) {
		this.write("VERBOSE", args)
	}
	info(...args: unknown[]) {
		this.write("INFO", args)
	}
	warn(...args: unknown[]) {
		this.write("WARN", args)
	}
	error(...args: unknown[]) {
		this.write("ERROR", args)
	}
	fatal(...args: unknown[]) {
		this.write("FATAL", args)
	}

	getHistory() {
		return this.history.toArray()
	}
}
