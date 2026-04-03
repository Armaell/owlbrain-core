import { InvalidDecoratorPlacementError } from "../../errors"
import { metadataWalker } from "../../scripts/metadata-walker"

export type ScriptClass<SCRIPT_DATA extends ScriptData> = {
	scriptData: SCRIPT_DATA
}

export type ScriptData = {
	/**
	 * If set, will register the script in the container at the given token.\
	 * You can then retrieve it using :
	 * ```ts
	 * const myScript = container.resolve<MyScript>([<my-token>])
	 * ```
	 * or
	 * ```ts
	 * @Inject([<my-token>])
	 * const myScript
	 * ```
	 */
	injectableAs?: ["script", ...string[]]
}

type BuilderFn<DECO_ARG, SCRIPT_DATA extends ScriptData> = (
	arg: DECO_ARG
) => Promise<BuilderFnReturn<SCRIPT_DATA>>

interface BuilderFnReturn<SCRIPT_DATA extends ScriptData> {
	scriptData?: SCRIPT_DATA
}

/**
 * Data stored and used by the script factory to instantiate the class
 */
export type ScriptDecoratorMeta<DECO_ARG, SCRIPT_DATA extends ScriptData> = {
	ScriptClass: Constructor
	build: BuilderFn<DECO_ARG, SCRIPT_DATA>
	arg: DECO_ARG
}

export type Constructor<T = any> = new (...args: any[]) => T

/**
 * Factory for creating event decorators.
 * `buildScriptDecorator()` is utility function to create your own styled scripts.
 *
 * ## The goal
 * The script decorator has two goal:
 *
 * 1. Instantiation
 * the decorator built will register itself to {@link MetadataWalker}, so that {@link ScriptFactory} can instantiate the script. This is handled by the factory, and also what the base `@Script()` simply do.
 *
 * 2. Create scriptData
 * The benefit of doing your own script decorator is to build a `scriptData`.
 * This data will be passed along to all event decorators in the class instance.
 * You can then use it as instance-wide configuration
 *
 * ## How to use it
 * ```ts
 * export const HttpScript = buildScriptDecorator(
 * 	async (decoArgs: DECO_ARG) => ({
 * 		scriptData: decoArgs
 * 	})
 * )
 * ```
 * This is a simple decorator that return the decorator arguments directly as `scriptData`.
 * Anyway it may be important to correctly set the types.
 *
 * Note that in our example, DECO_ARG and SCRIPT_DATA are the same type.
 *
 * @template DECO_ARG type the decorator argument, the data users will give you.
 * @template SCRIPT_DATA type of the resulting `scriptData`.
 */
export function buildScriptDecorator<DECO_ARG, SCRIPT_DATA extends ScriptData>(
	builder: BuilderFn<DECO_ARG, SCRIPT_DATA>
) {
	return (arg?: DECO_ARG) => (ctor: any, context: ClassDecoratorContext) => {
		if (context.kind !== "class") {
			throw new InvalidDecoratorPlacementError({
				decoratedName: context.name ?? "",
				actualKind: context.kind,
				expectedKind: "class"
			})
		}

		metadataWalker.registerScriptMeta({
			ScriptClass: ctor as Constructor,
			build: builder,
			arg
		})

		return ctor
	}
}
