import { TokenAlreadyExistError, TokenNotFoundError } from "../errors"
import { Logger } from "../logging/logger"
import { createGlobalSingleton } from "../utils"

export type InjectionToken = [string, ...string[]]

export class Container {
	private logger = new Logger(["core", "di"])
	private registry = new Map<string, unknown>()
	private waiters = new Map<string, Array<(value: unknown) => void>>()

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

	has(token: InjectionToken): boolean {
		const registryToken = toRegistryToken(token)
		return this.registry.has(registryToken)
	}

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

	private resolvePendingResolvers(storeToken: string, value: unknown) {
		const list = this.waiters.get(storeToken)
		if (!list) return

		for (const resolve of list) {
			resolve(value)
		}
		this.waiters.delete(storeToken)
	}
}

function toRegistryToken(token: InjectionToken): string {
	return token.filter((t) => !!t).join(".")
}

export const container = createGlobalSingleton(
	"owlbrain.container",
	() => new Container()
)
