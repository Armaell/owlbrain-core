import fs from "node:fs"
import path from "node:path"
import { blue, bold, cyan, dim, red, yellow } from "colorette"

const EXAMPLE_DIRS = [
	path.resolve("examples/features"),
	path.resolve("examples/practical")
]

function listExamplesByFolder() {
	const groups: Record<string, string[]> = {}

	for (const dir of EXAMPLE_DIRS) {
		const groupName = path.basename(dir)

		if (!fs.existsSync(dir)) continue

		const entries = fs
			.readdirSync(dir)
			.filter((name) => fs.statSync(path.join(dir, name)).isDirectory())

		groups[groupName] = entries
	}

	return groups
}

function findExamplePath(name: string) {
	for (const dir of EXAMPLE_DIRS) {
		const full = path.join(dir, name)
		if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
			return full
		}
	}
	return null
}

function printHelp() {
	const groups = listExamplesByFolder()

	console.log("\n" + bold("Available examples:"))

	const groupNames = Object.keys(groups)

	for (const group of groupNames) {
		console.log(`${group.toLocaleUpperCase()}`)

		const items = groups[group]
		const lastItem = items[items.length - 1]

		for (const item of items) {
			const isLastItem = item === lastItem
			const itemPrefix = isLastItem ? "  └─" : "  ├─"
			console.log(`${dim(itemPrefix)} ${blue(item)}`)
		}
	}

	console.log("\n" + bold("Usage:"))
	console.log(yellow("  npm run example <name>\n"))
}

async function main() {
	const name = process.argv[2]

	if (["--help", "-h"].includes(name)) {
		printHelp()
		return
	}

	if (!name) {
		console.log(
			yellow("❗ No example name provided. Printing list of examples instead.")
		)
		printHelp()
		return
	}

	const examplePath = findExamplePath(name)

	if (!examplePath) {
		console.log(
			bold(red(`❗ Unknown example: "${name}".`)),
			yellow("Printing list of examples instead.")
		)
		printHelp()
		return
	}

	const entry = path.join(examplePath, "index.ts")

	console.log(bold(cyan(`▶ Running example: ${name}\n`)))
	console.log(cyan("‾".repeat(process.stdout.columns || 40)))
	await import(entry)
}

main()
