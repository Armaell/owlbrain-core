import glob from "fast-glob"
import type { EventBusConsumer } from "../events-bus/consumer"
import type { Logger } from "../logging/logger"
import path from "path"
import type { LifecycleMachine } from "../core/lifecycle"
import { ScriptFactory } from "./factory"
import { container } from "../di/container"

/**
 * Responsible for :
 * - script discovery by file importing
 * - keep hold of references to scripts
 */
export class ScriptRegistry {
	private scriptFactory: ScriptFactory
	private scripts = new Set<object>()

	constructor(
		private consumer: EventBusConsumer,
		private lifecycle: LifecycleMachine,
		private logger: Logger
	) {
		this.scriptFactory = container.register(
			["core", "scripts", "factory"],
			new ScriptFactory(this.lifecycle, this.consumer)
		)
	}

	/**
	 * Dynamically imports all script files matching a user-provided glob pattern.\
	 * This triggers decorator execution, which in turn register them to {@link MetadataWalker}.
	 */
	async importScriptFiles(userPattern: string) {
		const base = path.isAbsolute(userPattern)
			? userPattern
			: path.resolve(process.cwd(), userPattern)

		const pattern = base.includes("*") ? base : path.join(base, "**/*.{ts,js}")

		const files = await glob(pattern)

		for (const file of files) {
			try {
				await import(path.resolve(file))
			} catch (err) {
				this.logger.error("Failed to import script file", file, err)
			}
		}
	}

	/**
	 * Instantiates all script classes that have been registered but not yet instantiated.
	 */
	public async instantiateMissingScripts() {
		const scripts = await this.scriptFactory.buildPendingScripts()

		for (const script of scripts) {
			this.scripts.add(script)
		}
	}
}
