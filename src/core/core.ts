import { container } from "../di/container"
import { EventBusConsumer } from "../events-bus/consumer"
import type { EventBus } from "../events-bus/events-bus"
import { InMemoryEventBus } from "../events-bus/in-memory-event-bus"
import { Logger } from "../logging/logger"
import {
	IntegrationConflictError,
	NotEnoughWorkersError,
	OwlBrainIsSingleUseError,
	RestrictedIntegrationNameError
} from "../errors"
import type { LifecycleHooks } from "./lifecycle"
import { LifecycleMachine, LifecycleState } from "./lifecycle"
import { ScriptRegistry } from "../scripts/registry"
import type { LogLevel } from "../logging/log-levels-registry"
import { EventBusFacade } from "../events-bus/facade"
import type {
	OwlIntegrationFactory,
	OwlIntegrationInterface
} from "../integrations/types"
import { ScheduleEventsEmitter } from "../schedule-events-emitter"

export interface OwlBrainConfig {
	integrations?: OwlIntegrationFactory[]
	/**
	 * Maximum number of events processed concurrently.\
	 * Defaults to 1, meaning strict sequential event handling.\
	 * Increasing this enables parallel script execution
	 */
	workers?: number
	/**
	 * Directory or glob pattern pointing to script files.\
	 * classes decorated by `@Script()` are imported, registered, and instantiated on file import.
	 */
	scriptsPath?: string

	/**
	 * Set per namespace the logging levels
	 * @default logging level is INFO
	 * @example
	 * ```json
	 * {
	 *   "": "INFO",                 // default level
	 *   "core": "WARN",             // all core logs
	 *   "core.eventbus": "DEBUG",   // more verbose for a sub-namespace
	 *   "homeassistant": "ERROR",   // integration-wide specific
	 * }
	 * ```
	 */
	logLevels?: Record<string, LogLevel>
}

type Builder = OwlBrainBuilder
type BuilderMethods = {
	[K in keyof Builder]: Builder[K]
}

export const OwlBrain: BuilderMethods = new Proxy({} as BuilderMethods, {
	get(_, prop) {
		const builder = new OwlBrainBuilder()
		const value = (builder as any)[prop]

		if (typeof value === "function") {
			return (...args: any[]) => value.apply(builder, args)
		}

		return value
	}
})

class OwlBrainBuilder {
	private static config: OwlBrainConfig = {
		integrations: [],
		logLevels: {}
	}

	configure(configuration: Partial<OwlBrainConfig>) {
		if (configuration.integrations)
			this.withIntegrations(...configuration.integrations)
		if (configuration.logLevels) this.withLoggerLevels(configuration.logLevels)
		if (configuration.scriptsPath)
			this.withScriptsPath(configuration.scriptsPath)
		if (configuration.workers) this.withWorkersCount(configuration.workers)
	}

	/**
	 * Register an integration and start its services
	 *
	 * @throws *IntegrationConflictError* if two integrations share the same namespace
	 */
	withIntegration(integration: OwlIntegrationFactory) {
		OwlBrainBuilder.config.integrations.push(integration)
		return this
	}

	/**
	 * Register integrations and start their services
	 *
	 * @throws *IntegrationConflictError* if two integrations share the same namespace
	 */
	withIntegrations(...integrations: OwlIntegrationFactory[]) {
		OwlBrainBuilder.config.integrations.push(...integrations)
		return integrations.reduce(
			(that, integration) => that.withIntegration(integration),
			this
		)
	}

	/**
	 * Set per namespace the logging level
	 * @default logging level is INFO
	 * @example
	 * ```ts
	 * .withLoggerLevel("", "INFO") // default level
	 * .withLoggerLevel("", "WARN") // core logs show only warn and above
	 * ```
	 */
	withLoggerLevel(namespace: string, level: LogLevel) {
		OwlBrainBuilder.config.logLevels[namespace] = level
		return this
	}

	/**
	 * Set per namespace the logging levels
	 * @default logging level is INFO
	 * @example
	 * ```json
	 * {
	 *   "": "INFO",                 // default level
	 *   "core": "WARN",             // all core logs
	 *   "core.eventbus": "DEBUG",   // more verbose for a sub-namespace
	 *   "homeassistant": "ERROR",   // integration-wide specific
	 * }
	 * ```
	 */
	withLoggerLevels(levels: Record<string, LogLevel>) {
		OwlBrainBuilder.config.logLevels = {
			...OwlBrainBuilder.config.logLevels,
			...levels
		}
		return this
	}

	/**
	 * Maximum number of events processed concurrently.\
	 * Defaults to 1, meaning strict sequential event handling.\
	 * Increasing this enables parallel script execution
	 */
	withWorkersCount(count: number) {
		if (count < 1) throw new NotEnoughWorkersError({})
		OwlBrainBuilder.config.workers = count
		return this
	}

	/**
	 * Directory or glob pattern pointing to script files.\
	 * classes decorated by `@Script()` are imported, registered, and instantiated on file import.
	 */
	withScriptsPath(path: string) {
		OwlBrainBuilder.config.scriptsPath = path
		return this
	}

	/**
	 * Build the OwlBrainCore and its dependencies
	 *
	 * Register to the container:
	 * - "core"
	 * - "core.lifecycle"
	 * - "core.eventbus"
	 * - "core.scripts"
	 */
	private async build(): Promise<OwlBrainCore> {
		if (container.has(["core"])) {
			throw new OwlBrainIsSingleUseError({})
		}

		const logger = new Logger(["core"])
		if (OwlBrainBuilder.config.logLevels)
			Logger.levels.bulkSet(OwlBrainBuilder.config.logLevels)

		const eventBus = new InMemoryEventBus()
		const lifecycle = container.register(
			["core", "lifecycle"],
			new LifecycleMachine(eventBus)
		)
		const consumer = new EventBusConsumer(
			eventBus,
			lifecycle,
			OwlBrainBuilder.config.workers ?? 1
		)
		container.register(
			["core", "eventbus"],
			new EventBusFacade(eventBus, consumer)
		)
		const scheduleEventsEmitter = container.register(
			["core", "scheduler"],
			new ScheduleEventsEmitter(eventBus, lifecycle)
		)
		await lifecycle.register(scheduleEventsEmitter)
		const scriptRegistry = container.register(
			["core", "scripts"],
			new ScriptRegistry(consumer, lifecycle, logger)
		)
		const integrations = new Map<string, OwlIntegrationInterface>()

		const core = new OwlBrainCore(
			eventBus,
			lifecycle,
			consumer,
			scriptRegistry,
			scheduleEventsEmitter,
			logger,
			integrations
		)
		container.register(["core"], core)

		for (const integration of OwlBrainBuilder.config.integrations ?? []) {
			await core.registerIntegration(integration)
		}

		if (OwlBrainBuilder.config.scriptsPath)
			await scriptRegistry.importScriptFiles(OwlBrainBuilder.config.scriptsPath)

		await scriptRegistry.instantiateMissingScripts()

		return core
	}

	async start() {
		const brain = await this.build()
		return brain.start()
	}

	/**
	 * Start then block until {@link OwlBrainCore.stop()} is called
	 */
	async run() {
		const brain = await this.build()
		return brain.run()
	}
}

export class OwlBrainCore {
	private static restrictedNamespaces = ["core", "script"]

	constructor(
		private readonly eventBus: EventBus,
		private readonly lifecycle: LifecycleMachine,
		private readonly consumer: EventBusConsumer,
		private readonly scriptRegistry: ScriptRegistry,
		private readonly scheduleEventsEmitter: ScheduleEventsEmitter,
		private readonly logger: Logger,
		private readonly integrations: Map<string, OwlIntegrationInterface>
	) {}

	/**
	 * Registers an integration to the lifecycle
	 *
	 * @throws *IntegrationConflictError* if two integrations share the same namespace
	 */
	async registerIntegration(integrationFactory: OwlIntegrationFactory) {
		const integration = integrationFactory()

		if (OwlBrainCore.restrictedNamespaces.includes(integration.name))
			throw new RestrictedIntegrationNameError({
				integrationName: integration.name
			})

		if (this.integrations.has(integration.name)) {
			throw new IntegrationConflictError({
				integrationName: integration.name,
				namespace: this.logger.namespace
			})
		}
		this.integrations.set(integration.name, integration)
		await this.lifecycle.register(integration as LifecycleHooks)
		return this
	}

	async start(): Promise<OwlBrainCore> {
		await this.lifecycle.transition(LifecycleState.Starting)

		this.logger.info("OwlBrain started")
		await this.lifecycle.transition(LifecycleState.Started)
		return this
	}

	/**
	 * Blocks until {@link OwlBrainCore.stop()} is called
	 */
	async wait(): Promise<OwlBrainCore> {
		if (
			this.lifecycle.state === LifecycleState.Stopping ||
			this.lifecycle.state === LifecycleState.Stopped
		)
			return this

		this.lifecycle.shouldBe(LifecycleState.Started)

		await this.consumer.wait()
		return this
	}

	/**
	 * Start then block until {@link OwlBrainCore.stop()} is called
	 */
	async run(): Promise<OwlBrainCore> {
		await this.start()
		await this.wait()

		return this
	}

	async stop() {
		if (
			this.lifecycle.state === LifecycleState.Stopping ||
			this.lifecycle.state === LifecycleState.Stopped
		)
			return this

		await this.lifecycle.transition(LifecycleState.Stopping)
		await this.consumer.stop()
		await this.lifecycle.transition(LifecycleState.Stopped)
		this.logger.info("OwlBrain stopped")

		return this
	}
}
