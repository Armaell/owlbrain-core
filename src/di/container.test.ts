import { describe, expect, it } from "vitest"
import { Container } from "./container"
import { TokenAlreadyExistError, TokenNotFoundError } from "../errors"

describe("Container", () => {
	it("registers and resolves a value", () => {
		const c = new Container()
		c.register(["a"], 123)

		expect(c.resolve(["a"])).toBe(123)
	})

	it("throws when registering the same token twice", () => {
		const c = new Container()
		c.register(["dup"], "x")

		expect(() => c.register(["dup"], "y")).toThrow(TokenAlreadyExistError)
	})

	it("throws when resolving a missing token", () => {
		const c = new Container()

		expect(() => c.resolve(["missing"])).toThrow(TokenNotFoundError)
	})

	it("resolveAsync resolves immediately if token exists", async () => {
		const c = new Container()
		c.register(["ready"], "ok")

		await expect(c.resolveAsync(["ready"])).resolves.toBe("ok")
	})

	it("resolveAsync waits until token is registered", async () => {
		const c = new Container()

		const promise = c.resolveAsync<string>(["later"])

		let resolved = false
		void promise.then((v) => {
			expect(v).toBe("done")
			resolved = true
		})

		expect(resolved).toBe(false)

		c.register(["later"], "done")

		await promise
		expect(resolved).toBe(true)
	})

	it("multiple async waiters resolve when token is registered", async () => {
		const c = new Container()

		const p1 = c.resolveAsync<string>(["multi"])
		const p2 = c.resolveAsync<string>(["multi"])

		c.register(["multi"], "value")

		await expect(p1).resolves.toBe("value")
		await expect(p2).resolves.toBe("value")
	})

	it("has() returns correct state", () => {
		const c = new Container()
		expect(c.has(["x"])).toBe(false)

		c.register(["x"], 42)
		expect(c.has(["x"])).toBe(true)
	})
})
