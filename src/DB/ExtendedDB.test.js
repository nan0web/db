import { describe, it } from "node:test"
import assert from "node:assert"
import ExtendedDB from "./ExtendedDB.js"

describe("ExtendedDB", () => {
	it("ExtendedDB inherits DB console", () => {
		const db = new ExtendedDB({
			cwd: "https://example.com",
			root: "api",
		})

		db.connect()
		db.hello()

		const c = db.console
		assert.ok(c)
	})
})
