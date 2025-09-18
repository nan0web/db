import { suite, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { NoConsole } from '@nan0web/log'
import DB from './DB.js'

suite("DB index functions", () => {
	describe('saveIndex', () => {
		it('should save index files correctly', async () => {
			const db = new DB({
				console: new NoConsole(),
				predefined: [
					["file1.txt", "Text file content"],
					["file2.json", { some: ["values", "here"] }]
				]
			})
			await db.connect()

			await db.saveIndex(".")

			// Check that both index files were created
			assert.ok(db.data.has("index.jsonl"))
			assert.ok(db.data.has("index.txt"))

			// Check JSONL content
			const jsonlContent = db.data.get("index.jsonl")
			assert.strictEqual(jsonlContent.length, 3)

			// Check TXT content
			const txtContent = db.data.get("index.txt")
			assert.ok(txtContent.includes(" file1.txt "))
			assert.ok(txtContent.includes(" file2.json "))
		})
	})

	describe('loadIndex', () => {
		it('should load index from JSONL file', async () => {
			const db = new DB({
				predefined: [
					["index.jsonl", [
						["F", "file1.txt", "mfp1xn5x", "j"],
						["F", "file2.json", "mfp1xn5x", "q"],
						["D", ".", "0", "0"],
					]
					]
				]
			})
			await db.connect()
			const index = await db.loadIndex(".")

			assert.strictEqual(index.entries.length, 3)
			const map = new Map(index.entries)

			const file1 = map.get("file1.txt")
			assert.ok(file1)
			assert.ok(file1.mtimeMs > 0)
			assert.ok(file1.size > 0)
			assert.strictEqual(file1.isFile, true)

			const file2 = map.get("file2.json")
			assert.ok(file2)
			assert.ok(file2.mtimeMs > 0)
			assert.ok(file2.size > 0)
			assert.strictEqual(file2.isFile, true)

			const dir1 = map.get(".")
			assert.ok(dir1)
			assert.strictEqual(dir1.isDirectory, true)
		})

		it('should load index from TXT file when JSONL is not available', async () => {
			const db = new DB({
				predefined: [
					["index.txt", "F file1.txt mecxlwg9 8x\nF file2.json mecvlwg9 8c\nD dir1/ mecvlwg9 0"],
				]
			})
			await db.connect()

			const index = await db.loadIndex()
			const map = new Map(index.entries)

			assert.ok(Array.isArray(index.entries))
			assert.strictEqual(index.entries.length, 3)

			const file1 = map.get("file1.txt")
			assert.ok(file1)

			const file2 = map.get("file2.json")
			assert.ok(file2)

			const dir1 = map.get("dir1/")
			assert.ok(dir1)
		})

		it('should return null when no index files exist', async () => {
			const db = new DB()
			const index = await db.loadIndex()
			assert.deepEqual(index.entries, [])
		})
	})

})
