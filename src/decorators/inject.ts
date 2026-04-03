import { type InjectionToken, container } from "../di/container"

/**
 * Inject an object from the {@link container}
 *
 * @remarks
 * Async injection, the value may be undefined if it's not yet created or is not found
 */
export function Inject(token: InjectionToken) {
	return function (value: undefined, context: ClassFieldDecoratorContext) {
		if (context.kind !== "field") {
			throw new Error("@Inject can only be used on class fields")
		}

		context.addInitializer(function () {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			container.resolveAsync(token).then((resolved) => {
				Object.defineProperty(this, context.name, {
					value: resolved,
					writable: false,
					enumerable: true,
					configurable: false
				})
			})
		})
	}
}
