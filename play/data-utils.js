#!/usr/bin/env node

import { Data } from "../src/index.js"
import { pressAnyKey } from "./simple-demos.js"
import { tabbed } from "./utils/index.js"

export async function runDataUtilsDemo(console) {
	console.clear()
	console.success("Data Utilities Demo")

	// Demo: flatten
	console.info("1. Flattening nested object:")
	const nestedObj = {
		user: {
			profile: { name: "Nano", age: 42 },
			settings: { theme: "dark", notifications: [true, false] }
		}
	}
	const flat = Data.flatten(nestedObj)
	console.info(tabbed(`Original: ${JSON.stringify(nestedObj, null, 2)}`, 3))
	console.info(tabbed(`Flat: ${JSON.stringify(flat, null, 2)}`, 3))

	await pressAnyKey(console)

	// Demo: unflatten
	console.info("\n2. Unflattening flat object:")
	const flatObj = {
		"user/profile/name": "Nano",
		"user/profile/age": 42,
		"user/settings/theme": "light",
		"user/settings/notifications/[0]": true,
		"user/settings/notifications/[1]": false
	}
	const unflattened = Data.unflatten(flatObj)
	console.info(tabbed(`Flat: ${JSON.stringify(flatObj, null, 2)}`, 3))
	console.info(tabbed(`Unflattened: ${JSON.stringify(unflattened, null, 2)}`, 3))

	await pressAnyKey(console)

	// Demo: merge
	console.info("\n3. Deep merging objects:")
	const targetObj = { user: { profile: { name: "Alice" } }, settings: { lang: "en" } }
	const sourceObj = { user: { profile: { age: 30 } }, settings: { theme: "dark" } }
	const merged = Data.merge(targetObj, sourceObj)
	console.info(tabbed(`Target: ${JSON.stringify(targetObj, null, 2)}`, 3))
	console.info(tabbed(`Source: ${JSON.stringify(sourceObj, null, 2)}`, 3))
	console.info(tabbed(`Merged: ${JSON.stringify(merged, null, 2)}`, 3))
	console.info(tabbed("Note: Arrays would be replaced, objects merged deeply.", 3))

	await pressAnyKey(console)

	// Demo: find by path
	console.info("\n4. Finding value by path:")
	const objForFind = { a: { b: { c: "found!" }, d: [1, { e: 42 }] } }
	const found1 = Data.find("a/b/c", objForFind)
	const found2 = Data.find("a/d/[1]/e", objForFind)
	console.info(tabbed(`'a/b/c' → ${JSON.stringify(found1)}`, 3))
	console.info(tabbed(`'a/d/[1]/e' → ${JSON.stringify(found2)}`, 3))

	console.success("\nData utils demo complete! 🔄")
}
