import { type LifecycleMachine, LifecycleState } from "../core/lifecycle"
import { metadataWalker } from "./metadata-walker"
import type { EventBusConsumer } from "../events-bus/consumer"
import type { OwlEvent } from "../events-bus/events-bus"
import { Logger } from "../logging/logger"
import { ScriptInstantiationError } from "../errors"
import type {
	BuilderFnReturn,
	EventDecoratorMeta
} from "../decorators/builders/event"
import type {
	ScriptClass,
	ScriptData,
	ScriptDecoratorMeta
} from "../decorators/builders/script"
import { container } from "../di/container"

type BuildingScript = {
	ScriptClass: Function
	/**
	 * Unique symbol per Script instance, will be used by {@link EventBusConsumer} and {@link KeyLockedQueue} to ensure a script only run one method concurrently
	 */
	key: symbol
	/**
	 * Instantiated Script
	 */
	instance: any
	/**
	 * What's needed to instantiate the script
	 */
	scriptMeta: ScriptDecoratorMeta<any, any>
	/**
	 * Data returned by the {@link buildScriptDecorator}'s builder function
	 */
	scriptData: ScriptData
}

type BuildingEventHandler = {
	ScriptClass: Function
	/**
	 * Unique symbol per Script instance, will be used by {@link EventBusConsumer} and {@link KeyLockedQueue} to ensure a script only run one method concurrently
	 */
	key: BuildingScript["key"]
	methodImpl: any
	/**
	 * Data used by the {@link EventBusConsumer}
	 */
	consumerData: BuilderFnReturn<any, any>
}

/**
 * Factory responsible for instantiating script classes, building their event
 * handlers, registering them on the event bus, and replaying missed lifecycle events.
 */
export class ScriptFactory {
	private logger = new Logger(["core", "scripts", "factory"])

	constructor(
		private lifecycle: LifecycleMachine,
		private consumer: EventBusConsumer<OwlEvent>
	) {}

	/**
	 * Builds all pending scripts discovered by decorators
	 */
	public async buildPendingScripts() {
		const allInstances: BuildingScript[] = []
		const allEventHandlers = []

		for (const [
			ScriptClass,
			scriptMetas
		] of metadataWalker.drainPendingScripts()) {
			const scriptsCount = scriptMetas.scriptMeta.length
			this.logger.debug(
				`Register ${scriptsCount} instance${scriptsCount > 1 ? "s" : ""} of ${ScriptClass.name}`
			)

			try {
				const instances = await this.buildScriptInstances(
					ScriptClass,
					scriptMetas.scriptMeta
				)
				const eventHandlers = await this.buildEventHandlers(
					ScriptClass,
					instances,
					scriptMetas.eventMeta
				)

				allInstances.push(...instances)
				allEventHandlers.push(...eventHandlers)
			} catch (err) {
				throw new ScriptInstantiationError({
					name: ScriptClass.name,
					cause: err
				})
			}
		}

		this.registerToContainer(allInstances)
		await this.catchupLifecycleEvents(allEventHandlers)
		this.registerEventHandlers(allEventHandlers)

		return allInstances.map((i) => i.instance)
	}

	private async buildScriptInstances(
		ScriptClass: Function,
		scriptMetas: ScriptDecoratorMeta<any, any>[]
	): Promise<BuildingScript[]> {
		let i = 1
		const instances = []
		for (const scriptMeta of scriptMetas) {
			const key = Symbol(`script:${scriptMeta.ScriptClass.name}.${i++}`)
			const builderScriptResponse = await scriptMeta.build(scriptMeta.arg)
			Object.defineProperty(scriptMeta.ScriptClass.prototype, "scriptData", {
				value: builderScriptResponse.scriptData,
				writable: false,
				enumerable: false,
				configurable: false
			})

			const instance = new scriptMeta.ScriptClass()

			instances.push({
				ScriptClass,
				key,
				instance,
				scriptMeta,
				scriptData: builderScriptResponse.scriptData
			})
		}
		return instances
	}

	private async buildEventHandlers(
		ScriptClass: Function,
		instances: BuildingScript[],
		eventMetas: EventDecoratorMeta<any>[]
	): Promise<BuildingEventHandler[]> {
		return Promise.all(
			instances.flatMap(({ key, instance, scriptMeta, scriptData }) =>
				eventMetas.map((eventMeta) =>
					this.buildEventHandler(
						ScriptClass,
						key,
						instance,
						scriptMeta,
						scriptData,
						eventMeta
					)
				)
			)
		)
	}

	private async buildEventHandler(
		ScriptClass: Function,
		key: symbol,
		instance: any,
		scriptMeta: ScriptDecoratorMeta<any, any>,
		scriptData: any,
		eventMeta: EventDecoratorMeta<any>
	) {
		const methodImpl = instance[eventMeta.methodName].bind(instance)
		const consumerData = await eventMeta.build(methodImpl, scriptData)
		return { ScriptClass, key, methodImpl, consumerData }
	}

	/**
	 * Registers all event handlers on the event bus consumer.
	 * Wraps each handler to support onReturnValue hooks.
	 */
	private registerEventHandlers(handlers: BuildingEventHandler[]) {
		for (const h of handlers) {
			this.consumer.register({
				namespace: h.consumerData.eventNamespace,
				method: h.consumerData.method,
				eventFilter: h.consumerData.eventFilter,
				eventName: h.consumerData.eventName,
				concurrencyKey: h.key
			})
		}
	}

	/**
	 * If a script specified a token, register it in the container
	 */
	private registerToContainer(instances: BuildingScript[]) {
		for (const {
			ScriptClass,
			scriptData: { injectableAs: token },
			instance
		} of instances) {
			try {
				if (token) {
					container.register(token, instance)
				}
			} catch (err) {
				throw new ScriptInstantiationError({
					name: ScriptClass.name,
					cause: err
				})
			}
		}
	}

	/**
	 * Replays lifecycle events (init, started) that have already occurred,
	 * ensuring scripts behave as if they were present from the beginning.
	 */
	private async catchupLifecycleEvents(handlers: BuildingEventHandler[]) {
		const current = this.lifecycle.state

		// We only care about these two lifecycle events
		const lifecycleEvents = [
			{ state: LifecycleState.Init, eventName: "init" },
			{ state: LifecycleState.Started, eventName: "started" }
		]

		// Determine which events have already happened
		const alreadyOccurred = lifecycleEvents.filter(
			(e) =>
				this.lifecycle.order.indexOf(e.state) <=
				this.lifecycle.order.indexOf(current)
		)

		if (alreadyOccurred.length === 0) return

		for (const { eventName } of alreadyOccurred) {
			for (const { ScriptClass, consumerData: registration } of handlers) {
				try {
					if (registration.eventName === eventName) {
						await registration.method({ name: eventName } as OwlEvent)
					}
				} catch (err) {
					throw new ScriptInstantiationError({
						name: ScriptClass.name,
						cause: err
					})
				}
			}
		}
	}
}
