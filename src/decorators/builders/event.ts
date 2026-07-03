import { InvalidDecoratorPlacementError } from "../../errors"
import type { OwlEvent } from "../../events-bus/events-bus"
import { metadataWalker } from "../../scripts/metadata-walker"

type BuilderFn<
	EVENT extends OwlEvent,
	DECO_ARGS extends any[],
	METHOD_ARGS extends any[] = [],
	RETURN = void
> = (
	invokedMethod: (event: EVENT, ...args: METHOD_ARGS) => Promise<RETURN>,
	scriptData: unknown,
	...args: DECO_ARGS
) => BuilderFnReturn<EVENT, RETURN> | Promise<BuilderFnReturn<EVENT, RETURN>>

export interface BuilderFnReturn<EVENT extends OwlEvent, RETURN = void> {
	/**
	 * The decorated method called on matching event.\
	 * You can use this to wrap the call
	 */
	method: (event: EVENT) => Promise<RETURN>
	/** Will trigger the method only on events passing this function */
	eventFilter?: (event: EVENT) => boolean
	eventNamespace?: string
	/** Will trigger the method only on events with this name */
	eventName?: string
}

/**
 * Data stored and used by the script factory to pass along the method to the {@link EventBusConsumer}
 */
export interface EventDecoratorMeta<EVENT extends OwlEvent> {
	methodName: string | symbol
	/** If **true**, this event handler can be ran event when another one in the script is being run,\
	 * otherwise, it will only be called if no other event handler in the script is already running */
	allowConcurrency?: boolean
	build: (
		methodImpl: (event: EVENT) => any,
		scriptData: unknown
	) => Promise<BuilderFnReturn<EVENT, any>>
}

/**
 * Factory for creating event decorators.
 *
 * ## The goal
 * `buildEventDecorator()` is utility function to create your own event handlers.
 * This will allow users to easily react to your own events, and strongly type them.
 * It also allows you to trigger side-effect on method call or on the returned value.
 *
 * ## What does it do behind the scenes
 * The builder will create a decorator that will register it to the {@link MetadataWalker},
 * which will pass along all information needed to the {@link ScriptFactory}.
 *
 * On instantiation by the {@link ScriptFactory}:
 * - retrieve any `scriptData` build by the script decorator
 * - call your builder function
 * - register the event methods to the {@link EventBusConsumer} with the rules you will give with the builder
 *
 * The resulting decorator also:
 * - wrap the decorated method and give you a callback on any value returned by the method
 * - strongly type the event in input, and the return type
 *
 * ## How to use it
 * ```ts
 * export const MyDecorator = buildEventDecorator(
 * 	async (
 * 		method: (event: EVENT) => RETURN,
 * 		scriptData: unknown,
 * 		eventConfig: DECO_ARGS
 * 	) => {
 * 		// This part of the function is called on script instantiation
 *
 * 		// Advised to type guard `scriptData`, we do not know which script decorator the user applied to the script
 * 		const scriptConfig = safelyParse(scriptData)
 *
 * 		// You can do here any side effect you desire
 * 		// As example, the HTTP integration will open endpoints
 *
 * 		// You can wrap the decorated method if you wish to do any action on call, or on the returned value
 * 		// In this example we do nothing, so we could have just forwarded the method to the return
 * 		const wrappedMethod = (event: EVENT) => method(event)
 *
 *		return {
 * 			method: wrappedMethod,
 * 			// We can set a eventName, the decorated will only be triggered by event with this exact name
 * 			eventName: "my_event_name",
 * 			// We can also use a filter function to do more advanced check on the event if it should trigger the decorated method
 * 			eventFilter: (event: EVENT) => event.data === "something"
 * 			// Use the name of your integration here so you don't react to event from other integrations
 * 			eventNamespace: "my namespace"
 * 		}
 * 	})
 * ```
 * You should correctly set the different templated type used as placeholder in the previous example:
 * @template EVENT Type the event sent to the decorated method
 * @template DECO_ARGS List of arguments of the decorator itself
 * @template RETURN Type of the value return by the decorated method
 */
export function buildEventDecorator<
	EVENT extends OwlEvent,
	DECO_ARGS extends any[],
	METHOD_ARGS extends any[] = [],
	RETURN = void
>(builder: BuilderFn<EVENT, DECO_ARGS, METHOD_ARGS, RETURN>) {
	return (...args: DECO_ARGS) =>
		(
			originalMethod: (event: EVENT, ...extra: METHOD_ARGS) => Promise<RETURN>,
			context: ClassMethodDecoratorContext
		) => {
			if (context.kind !== "method") {
				throw new InvalidDecoratorPlacementError({
					decoratedName: context.name,
					actualKind: context.kind,
					expectedKind: "method"
				})
			}

			metadataWalker.addEventMeta({
				methodName: context.name,
				build: async (methodImpl: any, scriptData: unknown) =>
					builder(methodImpl as any, scriptData, ...args)
			})

			return originalMethod
		}
}
