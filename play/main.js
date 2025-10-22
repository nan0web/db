#!/usr/bin/env node

import process from "node:process"

import Logger from "@nan0web/log"
import { select } from "@nan0web/ui-cli"

import { runBasicOperationsDemo } from "./basic-operations.js"
import { runDataUtilsDemo } from "./data-utils.js"
import { runFetchAdvancedDemo } from "./fetch-advanced.js"
import { runIndexUtilsDemo } from "./index-utils.js"
import { runSimpleDemos } from "./simple-demos.js"

const console = new Logger({ level: "info" })

// Clear screen and show logo
console.clear()
console.info(Logger.style(Logger.LOGO, { color: "cyan" }))

async function chooseDemo() {
	const demos = [
		{ name: "Simple Demos", value: "simple" },
		{ name: "Basic Operations (get/set/push)", value: "basic" },
		{ name: "Data Utils (flatten/merge/find)", value: "data" },
		{ name: "Advanced Fetch (refs/inherit)", value: "fetch" },
		{ name: "Directory Indexes", value: "index" },
		{ name: "← Exit", value: "exit" }
	]

	const choice = await select({
		title: "Select DB playground demo:",
		prompt: "[db]: ",
		invalidPrompt: Logger.style("[db invalid]", { color: "red" }) + ": ",
		options: demos.map(d => d.name),
		console
	})

	return demos[choice.index].value
}

async function showMenu() {
	console.info("\n" + "=".repeat(50))
	console.info("Demo completed. Returning to menu...")
	console.info("=".repeat(50) + "\n")
}

async function main() {
	while (true) {
		try {
			const demoType = await chooseDemo()

			switch (demoType) {
				case "simple":
					await runSimpleDemos(console)
					break
				case "basic":
					await runBasicOperationsDemo(console)
					break
				case "data":
					await runDataUtilsDemo(console)
					break
				case "fetch":
					await runFetchAdvancedDemo(console)
					break
				case "index":
					await runIndexUtilsDemo(console)
					break
				case "exit":
					console.success("Thanks for exploring @nan0web/db! 🚀")
					process.exit(0)
				default:
					console.warn("Unknown demo selected")
			}

			await showMenu()
		} catch (error) {
			if (error.message?.includes("cancel")) {
				console.warn("\nDemo cancelled. Returning to menu...")
				await showMenu()
				continue
			}
			console.error(error)
			process.exit(1)
		}
	}
}

main().catch(err => {
	console.error(err)
	process.exit(1)
})