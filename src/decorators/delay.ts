import { randomUUID } from "node:crypto"
import { container } from "../di/container"
import type { EventBusFacade } from "../events-bus/facade"
import { InvalidDecoratorPlacementError } from "../errors"

const namespace = "core.delay"

/**
 * Delay function call by {@link timeInMs}.
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

		return function (this: T, ...args: A): Promise<R> {
			return new Promise<R>((resolve, reject) => {
				void (async () => {
					const eventBus = await container.resolveAsync<EventBusFacade>([
						"core",
						"eventbus"
					])
					const eventName = randomUUID()

					eventBus.listen({
						namespace,
						eventName,
						once: true,
						method: async () => {
							try {
								resolve(await value.call(this, ...args))
							} catch (err) {
								reject(err)
							}
						}
					})

					const timer = setTimeout(() => {
						void eventBus.emit({ namespace, name: eventName })
					}, timeInMs)

					// Prevent timer from keeping Node alive
					if (typeof timer.unref === "function") {
						timer.unref()
					}
				})()
			})
		}
	}
}
