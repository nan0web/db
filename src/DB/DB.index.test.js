import { suite, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { NoConsole } from '@nan0web/log'
import DB from './DB.js'
import DirectoryIndex from '../DirectoryIndex.js'

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
			assert.ok(db.data.has("index.txtl"))
			assert.ok(db.data.has("index.txt"))

			// Check JSONL content
			const long = db.data.get("index.txtl")
			assert.ok(long.includes("\nfile1.txt "))
			assert.ok(long.includes("\nfile2.json "))
			assert.ok(long.includes("long\n"))
			assert.ok(long.includes("\ninc\n"))

			// Check TXT content
			const txtContent = db.data.get("index.txt")
			assert.ok(txtContent.includes("\nfile1.txt "))
			assert.ok(txtContent.includes("\nfile2.json "))
		})
	})

	describe('loadIndex', () => {
		it('should load index from JSONL file', async () => {
			const db = new DB({
				predefined: [
					["index.txtl", [
						"inc",
						"---",
						"dir1/",
						"file1.txt 1 1",
						"file2.json 2 2",
					].join("\n")]
				]
			})
			await db.connect()
			const index = await db.loadIndex(".")

			assert.strictEqual(index.entries.length, 2)
			const map = new Map(index.entries)

			const file1 = map.get("dir1/file1.txt")
			assert.ok(file1)
			assert.ok(file1.mtimeMs > 0)
			assert.ok(file1.size > 0)
			assert.strictEqual(file1.isFile, true)

			const file2 = map.get("dir1/file2.json")
			assert.ok(file2)
			assert.ok(file2.mtimeMs > 0)
			assert.ok(file2.size > 0)
			assert.strictEqual(file2.isFile, true)
		})

		it('should load index from TXT file when JSONL is not available', async () => {
			const db = new DB({
				predefined: [
					["index.txt", "file1.txt mecxlwg9 8x\nfile2.json mecvlwg9 8c\ndir1/ mecvlwg9 0"],
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

		it('should return empty index when no index files exist', async () => {
			const db = new DB()
			const index = await db.loadIndex()
			assert.deepEqual(index.entries, [])
		})
	})

	describe('buildIndexes', () => {
		it('should build index files for deep structure', async () => {
			const db = new DB({
				root: "dist",
				predefined: [
					['level1.json', { value: 'level1' }],
					['dir1/level2.json', { value: 'level2' }],
					['dir1/subdir/level3.json', { value: 'level3' }],
					['dir2/index.json', { title: 'directory index' }],
				],
				console: new NoConsole()
			})
			await db.connect()

			await db.buildIndexes()
			const getDbIndex = (file) =>
				String(db.data.get(file) || "").split("\n").map(
					row => row.split(" ")[0]
				)

			const r1 = getDbIndex("dir1/subdir/index.txt")
			assert.deepStrictEqual(r1, ["level3.json"])
			const r2 = getDbIndex("dir2/index.txt")
			assert.deepStrictEqual(r2, ["index.json"])
			const r3 = getDbIndex("dir1/index.txt")
			assert.deepStrictEqual(r3, ["level2.json", "subdir/"])
			const r4 = getDbIndex("index.txt")
			assert.deepStrictEqual(r4, ["dir1/", "dir2/", "level1.json"])
		})

		it('should build index files correctly', async () => {
			const db = new DB({
				predefined: [
					['file1.json', { value: 'content1' }],
					['file2.json', { value: 'content2' }],
					['dir/file3.json', { value: 'content3' }]
				],
				console: new NoConsole()
			})
			await db.connect()

			await db.buildIndexes()

			assert.ok(db.data.has('index.txtl'))
			assert.ok(db.data.has('index.txt'))
		})
	})

	describe('dump', () => {
		it("should dump data properly", async () => {
			const db = new DB({
				predefined: [
					["index.html", "<html></html>"],
					["data.json", { "key": "value" }],
				]
			})
			await db.connect()
			const output = new DB()
			await output.connect()

			const times = Object.fromEntries(Array.from(db.meta.entries()).map(
				([uri, stat]) => [uri, stat.mtimeMs]
			))
			await new Promise(resolve => setTimeout(resolve, 33))
			await db.dump(output)

			const updated = Object.fromEntries(Array.from(output.meta.entries()).map(
				([uri, stat]) => [uri, stat.mtimeMs]
			))

			assert.ok(times["index.html"] < updated["index.html"])
			assert.ok(times["data.json"] < updated["data.json"])
			assert.ok(updated["index.txt"] > 0)
			assert.ok(updated["index.txtl"] > 0)
		})
	})
})
