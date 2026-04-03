export type LogLevel = "DEBUG" | "VERBOSE" | "INFO" | "WARN" | "ERROR" | "FATAL"

/**
 * Set the logging level per namespace
 */
export class LogLevelRegistry {
	private levels = new Map<string, LogLevel>()
	private defaultLevel: LogLevel = "INFO"

	private static levelsOrder = {
		DEBUG: 0,
		VERBOSE: 1,
		INFO: 2,
		WARN: 3,
		ERROR: 4,
		FATAL: 5
	}

	setDefault(level: LogLevel) {
		this.defaultLevel = level
	}

	set(namespace: string, level: LogLevel) {
		this.levels.set(namespace, level)
	}

	bulkSet(levels: Record<string, LogLevel>) {
		for (const [ns, level] of Object.entries(levels)) {
			if (ns === "") {
				this.setDefault(level)
			} else {
				this.set(ns, level)
			}
		}
	}

	/**
	 * Resolve the most specific matching namespace.
	 * Example: namespaces ["A","D"] → checks:
	 *   "A.D", "A", "" (default)
	 */
	resolve(namespace: string[]): LogLevel {
		for (let i = namespace.length; i >= 0; i--) {
			const key = namespace.slice(0, i).join(".")
			if (this.levels.has(key)) {
				return this.levels.get(key)!
			}
		}
		return this.defaultLevel
	}

	shouldLog(namespace: string[], level: LogLevel): boolean {
		const current = this.resolve(namespace)
		return (
			LogLevelRegistry.levelsOrder[level] >=
			LogLevelRegistry.levelsOrder[current]
		)
	}
}
