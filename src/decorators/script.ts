import { buildScriptDecorator } from "./builders/script"

type ScriptDecoratorConfig = {
	/**
	 * For user only, to differentiate their scripts instances
	 */
	name?: string
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

export const Script = buildScriptDecorator(
	async (config: ScriptDecoratorConfig = {}) => ({ scriptData: config })
)
