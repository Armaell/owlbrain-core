import { TokenAlreadyExistError, TokenNotFoundError } from "../errors"
import { Logger } from "../logging/logger"
import { createGlobalSingleton } from "../utils"

export type InjectionToken = [string, ...string[]]

/**
 * Lightweight dependency injection container
 */
export class Container {
	private logger = new Logger(["core", "di"])
	private registry = new Map<string, unknown>()
	private waiters = new Map<string, Array<(value: unknown) => void>>()

	/**
	 * Registers a value for a given token.
	 *
	 * @param token - The injection token
	 * @param value - The value to register
	 * @throws TokenAlreadyExistError if the token already exists
	 */
	register<T>(token: InjectionToken, value: T): T {
		const registryToken = toRegistryToken(token)

		if (this.registry.has(registryToken)) {
			throw new TokenAlreadyExistError({
				namespace: this.logger.namespace,
				token: registryToken
			})
		}

		this.registry.set(registryToken, value)
		this.resolvePendingResolvers(registryToken, value)
		return value
	}

	/**
	 * Checks whether a token is registered.
	 */
	has(token: InjectionToken): boolean {
		const registryToken = toRegistryToken(token)
		return this.registry.has(registryToken)
	}

	/**
	 * Resolves a token synchronously
	 *
	 * @param token - The injection token
	 * @throws TokenNotFoundError if the token is not registered.
	 */
	resolve<T>(token: InjectionToken): T {
		const registryToken = toRegistryToken(token)
		if (!this.has(token)) {
			throw new TokenNotFoundError({
				namespace: this.logger.namespace,
				token: registryToken
			})
		}
		return this.registry.get(registryToken) as T
	}

	/**
	 * Resolves a token asynchronously.
	 * If the token is already registered, resolves immediately.
	 * Otherwise, returns a promise that resolves once the token is registered.
	 *
	 * @param token - The injection token
	 * @warning may hang up indefinitely if the token is never registered
	 */
	resolveAsync<T>(token: InjectionToken): Promise<T> {
		const registryToken = toRegistryToken(token)

		if (this.registry.has(registryToken)) {
			return Promise.resolve(this.registry.get(registryToken) as T)
		}

		return new Promise<T>((resolve) => {
			const list = this.waiters.get(registryToken)
			if (list) {
				list.push(resolve as (value: unknown) => void)
			} else {
				this.waiters.set(registryToken, [resolve as (value: unknown) => void])
			}
		})
	}

	/**
	 * Resolves all pending async resolvers waiting for a token.
	 *
	 * @param storeToken - The internal registry token
	 * @param value - The resolved value
	 */
	private resolvePendingResolvers(storeToken: string, value: unknown) {
		const list = this.waiters.get(storeToken)
		if (!list) return

		for (const resolve of list) {
			resolve(value)
		}
		this.waiters.delete(storeToken)
	}
}

/**
 * Converts an InjectionToken into a dot‑joined registry key.
 *
 * @param token - The injection token
 * @example ["core", "di"] → "core.di"
 */
function toRegistryToken(token: InjectionToken): string {
	return token.filter((t) => !!t).join(".")
}

export const container = createGlobalSingleton(
	"owlbrain.container",
	() => new Container()
)
