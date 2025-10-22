#!/usr/bin/env node

import { DB, FetchOptions } from "../src/index.js"
import { pressAnyKey } from "./simple-demos.js"
import { tabbed } from "./utils/index.js"

export async function runFetchAdvancedDemo(console) {
	console.clear()
	console.success("Advanced Fetch Demo (Refs & Inheritance)")

	// Setup DB with inheritance, globals, and references
	const db = new DB({
		console: console,
		predefined: [
			// Globals in _/
			["_/globals.json", { site: "nan0web", version: "1.0" }],
			// Inheritance files (_ in dirs)
			["blog/_/theme.json", { bg: "light", font: "serif" }],
			["blog/post1/_/meta.json", { category: "news" }],
			// Documents with refs
			["blog/post1.md", { title: "First Post", $ref: "blog/post1/_/meta.json", content: "Hello World" }],
			["shared/data.json", { author: "NanoCoder" }]
		]
	})
	await db.connect()

	console.info("DB setup with:")
	console.info("• Globals: _/globals.json")
	console.info("• Inheritance: blog/_/theme.json, blog/post1/_/meta.json")
	console.info("• Doc with refs: blog/post1.md\n")

	await pressAnyKey(console)

	// Demo: fetch with defaults (inherit, globals, refs)
	console.info("1. Fetching 'blog/post1.md' with full options:")
	const opts = new FetchOptions({ inherit: true, globals: true, refs: true })
	const post1 = await db.fetch("blog/post1", opts)
	console.info(tabbed(`Result: ${JSON.stringify(post1, null, 2)}`))
	console.info(tabbed("(Merged: globals + inheritance + resolved $ref)"))

	await pressAnyKey(console)

	// Demo: fetch without refs
	console.info("\n2. Fetching without reference resolution:")
	const optsNoRefs = new FetchOptions({ refs: false })
	const post1Raw = await db.fetch("blog/post1", optsNoRefs)
	console.info(tabbed(`Raw (no refs): ${JSON.stringify(post1Raw, null, 2)}`))

	await pressAnyKey(console)

	// Demo: fetch directory index
	console.info("\n3. Fetching directory as index (allowDirs):")
	const dirIndex = await db.fetch("blog/", { allowDirs: true })
	console.info(tabbed(`Dir index: ${JSON.stringify(dirIndex, null, 2)}`))
	console.info(tabbed("(Fetches blog/index.json if exists, or lists entries)"))

	console.success("\nAdvanced fetch demo complete! 🔗")
}
