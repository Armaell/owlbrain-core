import { beforeEach, describe, expect, it } from "vitest"
import { LogLevelRegistry } from "./log-levels-registry"

describe("LogLevelRegistry", () => {
	let registry: LogLevelRegistry

	beforeEach(() => {
		registry = new LogLevelRegistry()
	})

	describe("default behavior", () => {
		it("returns INFO level", () => {
			expect(registry.resolve(["A", "B"])).toBe("INFO")
		})

		it("allows overriding the default level", () => {
			registry.setDefault("DEBUG")
			expect(registry.resolve(["whatever"])).toBe("DEBUG")
		})
	})

	describe("namespace resolution", () => {
		it("returns the exact namespace level when set", () => {
			registry.set("A.B", "WARN")
			expect(registry.resolve(["A", "B"])).toBe("WARN")
		})

		it("falls back to parent namespaces when exact match is missing", () => {
			registry.set("A", "ERROR")
			expect(registry.resolve(["A", "B", "C"])).toBe("ERROR")
		})

		it("falls back to default when no namespace matches", () => {
			registry.setDefault("VERBOSE")
			expect(registry.resolve(["X", "Y"])).toBe("VERBOSE")
		})

		it("resolves the most specific namespace first", () => {
			registry.set("A.B", "WARN")
			registry.set("A", "INFO")
			registry.set("A.B.C", "ERROR")

			expect(registry.resolve(["A", "B", "C"])).toBe("ERROR")
			expect(registry.resolve(["A", "B"])).toBe("WARN")
			expect(registry.resolve(["A"])).toBe("INFO")
		})
	})

	describe("bulkSet", () => {
		it("assigns multiple namespaces", () => {
			registry.bulkSet({
				"A": "DEBUG",
				"A.B": "WARN",
				"C": "ERROR"
			})

			expect(registry.resolve(["A"])).toBe("DEBUG")
			expect(registry.resolve(["A", "B"])).toBe("WARN")
			expect(registry.resolve(["C"])).toBe("ERROR")
		})

		it("updates default level when key is empty string", () => {
			registry.bulkSet({
				"": "FATAL",
				"A": "INFO"
			})

			expect(registry.resolve(["unknown"])).toBe("FATAL")
			expect(registry.resolve(["A"])).toBe("INFO")
		})
	})

	describe("shouldLog", () => {
		it("returns true when level >= resolved level", () => {
			registry.set("A", "WARN")

			expect(registry.shouldLog(["A"], "ERROR")).toBe(true)
			expect(registry.shouldLog(["A"], "WARN")).toBe(true)
		})

		it("returns false when level < resolved level", () => {
			registry.set("A", "ERROR")

			expect(registry.shouldLog(["A"], "INFO")).toBe(false)
			expect(registry.shouldLog(["A"], "WARN")).toBe(false)
		})

		it("uses default level when no namespace matches", () => {
			registry.setDefault("VERBOSE")

			expect(registry.shouldLog(["X"], "DEBUG")).toBe(false)
			expect(registry.shouldLog(["X"], "INFO")).toBe(true)
		})
	})
})
