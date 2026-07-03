/* eslint-disable @typescript-eslint/no-misused-promises */
import { InvalidDecoratorPlacementError } from "../errors"
import { metadataWalker } from "../scripts/metadata-walker"

/**
 * Delay function call by {@link timeInMs}
 *
 * @warn This force this event handler to be able to be ran concurrently of
 * this script other event handlers
 */
export function Delay(timeInMs: number) {
	return function <T, A extends any[], R>(
		value: (this: T, ...args: A) => R | Promise<R>,
		context: ClassMethodDecoratorContext<T>
	) {
		if (context.kind !== "method") {
			throw new InvalidDecoratorPlacementError({
				decoratorName: "Delay",
				decoratedName: context.name,
				actualKind: context.kind,
				expectedKind: "method"
			})
		}

		metadataWalker.updateEventMeta({
			methodName: context.name,
			allowConcurrency: true
		})

		return function (this: T, ...args: A): Promise<R> {
			return new Promise<R>((resolve, reject) => {
				const timer = setTimeout(async () => {
					try {
						resolve(await value.call(this, ...args))
					} catch (err) {
						reject(err)
					}
				}, timeInMs)

				// Prevent timer from keeping Node alive
				if (typeof timer.unref === "function") {
					timer.unref()
				}
			})
		}
	}
}
