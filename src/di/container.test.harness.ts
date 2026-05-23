import { TokenAlreadyExistError, TokenNotFoundError } from "../errors"
import type { InjectionToken } from "./container"
import { Container } from "./container"

export function createContainerHarness() {
	const container = new Container()

	return {
		container,

		register: <T>(token: InjectionToken, value: T) =>
			container.register(token, value),

		resolve: <T>(token: InjectionToken) => container.resolve<T>(token),

		resolveAsync: <T>(token: InjectionToken) =>
			container.resolveAsync<T>(token),

		expectAlreadyExists: (fn: () => unknown) => {
			let threw = false
			try {
				fn()
			} catch (err) {
				threw = err instanceof TokenAlreadyExistError
			}
			if (!threw) throw new Error("Expected TokenAlreadyExistError")
		},

		expectNotFound: (fn: () => unknown) => {
			let threw = false
			try {
				fn()
			} catch (err) {
				threw = err instanceof TokenNotFoundError
			}
			if (!threw) throw new Error("Expected TokenNotFoundError")
		}
	}
}
