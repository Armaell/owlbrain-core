import { type InjectionToken, container } from "../di/container"
import { InvalidDecoratorPlacementError } from "../errors"

/**
 * Inject an object from the {@link container}
 *
 * @remarks
 * Async injection, the value may be undefined if it's not yet created or is not found
 *
 * @warning In scripts, injected values are not available in constructors, use `OnInit` and `OnStart` decorators
 */
export function Inject(token: InjectionToken) {
	return function (value: undefined, context: ClassFieldDecoratorContext) {
		if (context.kind !== "field") {
			throw new InvalidDecoratorPlacementError({
				decoratorName: "Inject",
				decoratedName: context.name,
				actualKind: context.kind,
				expectedKind: "field"
			})
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
