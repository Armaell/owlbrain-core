import type { EventDecoratorMeta } from "../decorators/builders/event"
import type { ScriptDecoratorMeta } from "../decorators/builders/script"
import { createGlobalSingleton } from "../utils"

/**
 * Collects and organizes metadata produced by script and event decorators.
 *
 * TC39 decorators are run in a specific order:
 *   1. Method decorators (@event) run as soon as each method is defined.
 *   2. Class decorators (@script) run after the class body is complete.
 *
 * So event decorators push in their order of execution.
 * - Events decorators ran consequently are in the same script.
 * - Scripts decorators own all previous events decorators since the last one.
 * 		On a new event decorator, we reset the stack since we are in a new Script class
 *
 * The {@link ScriptFactory} later drains these accumulated batches to instantiate
 * script classes and register their related event handlers.
 */
export class MetadataWalker {
	private eventMetaStack: EventDecoratorMeta<any>[] = []
	private lastScriptClass?: Function

	private scriptsPending = new Map<
		Function,
		{
			scriptMeta: ScriptDecoratorMeta<any, any>[]
			eventMeta: EventDecoratorMeta<any>[]
		}
	>()

	/**
	 * Records metadata for an event-decorated method.
	 * Called by method decorators during class definition.
	 */
	addEventMeta(data: EventDecoratorMeta<any>) {
		this.eventMetaStack.push(data)
	}

	/**
	 * Registers metadata for a script-decorated class.
	 * Captures the current event metadata stack and resets it.
	 */
	registerScriptMeta(data: ScriptDecoratorMeta<any, any>) {
		if (data.ScriptClass !== this.lastScriptClass) {
			this.lastScriptClass = data.ScriptClass

			this.scriptsPending.set(data.ScriptClass, {
				scriptMeta: [data],
				eventMeta: [...this.eventMetaStack]
			})

			this.eventMetaStack = []
		} else {
			this.scriptsPending.get(data.ScriptClass)?.scriptMeta.push(data)
		}
	}

	/**
	 * Returns all pending script metadata and clears the buffer.
	 */
	drainPendingScripts() {
		const pending = this.scriptsPending
		this.scriptsPending = new Map()
		return pending.entries()
	}
}

export const metadataWalker = createGlobalSingleton(
	"owlbrain.scripts.walker",
	() => new MetadataWalker()
)
