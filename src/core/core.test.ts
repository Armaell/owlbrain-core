import { beforeEach, describe, expect, it, vi } from "vitest"
import { OwlBrain } from "./core"
import { ScriptRegistry } from "../scripts/registry"
import { container } from "../di/container"

beforeEach(() => {
	vi.restoreAllMocks()

	const BuilderClass = (OwlBrain as any).withWorkersCount(1).constructor as any
	BuilderClass.config = {}
	;(container as any).registry.clear()
	;(container as any).waiters.clear()
})

describe("OwlBrainBuilder", () => {
	describe("#withScriptsPath", () => {
		it("does not import any scripts when never called", async () => {
			const importScriptFiles = vi
				.spyOn(ScriptRegistry.prototype, "importScriptFiles")
				.mockResolvedValue(undefined)

			const core = await OwlBrain.withWorkersCount(1).start()

			expect(importScriptFiles).not.toHaveBeenCalled()

			await core.stop()
		})

		it("imports scripts from the configured pattern", async () => {
			const importScriptFiles = vi
				.spyOn(ScriptRegistry.prototype, "importScriptFiles")
				.mockResolvedValue(undefined)

			const core = await OwlBrain.withWorkersCount(1)
				.withScriptsPath("pattern")
				.start()

			expect(importScriptFiles).toHaveBeenCalledTimes(1)
			expect(importScriptFiles).toHaveBeenCalledWith("pattern")

			await core.stop()
		})

		it("imports scripts from the configured patterns", async () => {
			const importScriptFiles = vi
				.spyOn(ScriptRegistry.prototype, "importScriptFiles")
				.mockResolvedValue(undefined)

			const core = await OwlBrain.withWorkersCount(1)
				.withScriptsPath("pattern-a")
				.withScriptsPath("pattern-b")
				.start()

			expect(importScriptFiles).toHaveBeenCalledTimes(2)
			expect(importScriptFiles).toHaveBeenCalledWith("pattern-a")
			expect(importScriptFiles).toHaveBeenCalledWith("pattern-b")

			await core.stop()
		})
	})
})
