import { defineConfig } from "tsup"

export default defineConfig({
	platform: "node",
	entry: ["src/index.ts", "src/integration.ts", "src/test.ts"],
	format: ["esm"],
	dts: true,
	sourcemap: true,
	clean: true,
	target: "node24",
	shims: false,
	splitting: false,
	treeshake: true,
	minify: false
})
