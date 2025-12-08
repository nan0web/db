import { describe, it } from "node:test"
import assert from "node:assert"

import Logger from "@nan0web/log"
import { PlaygroundTest } from "@nan0web/ui-cli/test"

describe("play/main.js interactive demo automation", () => {
	it("should run scan demo then exit using PLAY_DEMO_SEQUENCE", async () => {
		const test = new PlaygroundTest({ ...process.env, PLAY_DEMO_SEQUENCE: "1,4" })
		const { stdout, stderr, exitCode } = await test.run()

		assert.strictEqual(exitCode, 0, `Process exited with code ${exitCode}. Stderr: ${stderr}`)
		assert.equal(stderr, "")
		// Verify that the scanning demo output appears
		assert.deepStrictEqual(stdout.split("\n").slice(0, 16), [
			Logger.LOGO,
			'Directory Scanning Demo',
			'Scanning play/ directory:',
			'- play/data/nested/file.txt (15 bytes)',
			'- play/data/config.yaml (106 bytes)',
			'- play/data/contacts.md (105 bytes)',
			'- play/data/index.yaml (23 bytes)',
			'- play/data/logs.txt (87 bytes)',
			'- play/data/users.json (173 bytes)',
			'- play/.gitignore (5 bytes)',
			'- play/main.js (5,229 bytes)',
			'- play/main.test.js (3,725 bytes)',
		].join("\n").split("\n"))
	})
})
