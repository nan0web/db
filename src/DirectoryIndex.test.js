import { describe, it } from 'node:test'
import assert from 'node:assert'
import DirectoryIndex from './DirectoryIndex.js'
import DocumentStat from './DocumentStat.js'

const basename = (path) => path.split('/').pop()
// (path) => {
// const parts = path.split('/')
// return path.endsWith('/') && parts.length > 1 ?
// parts[parts.length - 2] + '/' : parts.pop()
// }

const dirname = (path) => {
	const parts = path.split('/').filter(part => part.length > 0)
	return parts.slice(0, -1).join('/') || '.'
}

const resolveSync = (dir, name) => {
	if (dir === '.' || dir === '') return name
	return `${dir}/${name}`
}

describe("getDirectoryEntries", () => {
	it("returns immediate children for root directory", () => {
		const db = {
			basename,
			meta: new Map([
				['file1.txt', new DocumentStat({ size: 100, isFile: true })],
				['dir1/', new DocumentStat({ size: 4096, isDirectory: true })],
				['subdir/file2.txt', new DocumentStat({ size: 200, isFile: true })],
				['index.txt', new DocumentStat({ size: 50 })],
				['index.jsonl', new DocumentStat({ size: 75 })]
			])
		}

		const entries = DirectoryIndex.getDirectoryEntries(db, '.')
		assert.strictEqual(entries.length, 3, "Should return direct children only")
		assert.deepStrictEqual(
			entries.map(([name]) => name).sort(),
			['dir1', 'file1.txt', 'subdir'].sort()
		)
	})

	it("returns immediate children for subdirectory", () => {
		const db = {
			basename, dirname,
			meta: new Map([
				['dir1/file1.txt', new DocumentStat({ size: 100, isFile: true })],
				['dir1/subdir/', new DocumentStat({ isDirectory: true })],
				['dir1/subdir/file2.txt', new DocumentStat({ size: 200, isFile: true })],
				['dir1/index.txt', new DocumentStat({ size: 50 })],
				['dir1/index.jsonl', new DocumentStat({ size: 75 })]
			])
		}

		const entries = DirectoryIndex.getDirectoryEntries(db, 'dir1/')
		assert.strictEqual(entries.length, 2, "Should return direct children only")
		assert.deepStrictEqual(
			entries.map(([name]) => name).sort(),
			['file1.txt', "subdir"].sort()
		)
	})

	it("ignores index files when collecting entries", () => {
		const db = {
			basename,
			meta: new Map([
				['dir1/file1.txt', new DocumentStat({ size: 100 })],
				['dir1/index.txt', new DocumentStat({ size: 50 })],
				['dir1/index.jsonl', new DocumentStat({ size: 75 })]
			])
		}

		const entries = DirectoryIndex.getDirectoryEntries(db, 'dir1/')
		assert.strictEqual(entries.length, 1, "Index files should be ignored")
		assert.strictEqual(entries[0][0], 'file1.txt')
	})

	it("sorts entries alphabetically with trailing slashes", () => {
		const db = {
			basename,
			meta: new Map([
				['zfile.txt', new DocumentStat({ size: 100 })],
				['afile.txt', new DocumentStat({ size: 200 })],
				['bdir/', new DocumentStat({ size: 4096, isDirectory: true })]
			])
		}

		const entries = DirectoryIndex.getDirectoryEntries(db, '.')
		assert.deepStrictEqual(
			entries.map(([name]) => name),
			['afile.txt', 'bdir', 'zfile.txt']
		)
	})

	it("handles special characters in filenames correctly", () => {
		const db = {
			basename,
			meta: new Map([
				['special file!.txt', new DocumentStat({ size: 512, mtimeMs: 1625097600000 })],
				['directory with spaces/', new DocumentStat({ isDirectory: true })],
				['ümlaut_file.txt', new DocumentStat({ size: 1024 })]
			])
		}

		const entries = DirectoryIndex.getDirectoryEntries(db, '.')
		assert.strictEqual(entries.length, 3)
		assert.deepStrictEqual(
			entries.map(([name]) => name).sort(),
			['directory with spaces', 'special file!.txt', 'ümlaut_file.txt'].sort()
		)
	})

	it("returns empty array for non-existing directory", () => {
		const db = {
			basename,
			meta: new Map()
		}

		const entries = DirectoryIndex.getDirectoryEntries(db, 'nonexistent/')
		assert.deepStrictEqual(entries, [])
	})
})

describe("getIndexesToUpdate", () => {
	it("gets correct indexes for root-level file", () => {
		const db = { dirname, resolveSync }

		const indexUris = DirectoryIndex.getIndexesToUpdate(db, 'file.txt')
		assert.deepStrictEqual(indexUris, [
			'index.jsonl',
			'index.txt'
		])
	})

	it("gets correct indexes for single-level subdirectory file", () => {
		const db = { dirname, resolveSync }

		const indexUris = DirectoryIndex.getIndexesToUpdate(db, 'dir1/file.txt')
		assert.deepStrictEqual(indexUris, [
			'dir1/index.jsonl',
			'dir1/index.txt',
			'index.jsonl',
			'index.txt'
		])
	})

	it("gets correct indexes for deeply nested file", () => {
		const db = { dirname, resolveSync }

		const indexUris = DirectoryIndex.getIndexesToUpdate(db, 'dir1/dir2/dir3/file.txt')
		assert.deepStrictEqual(indexUris, [
			'dir1/dir2/dir3/index.jsonl',
			'dir1/dir2/dir3/index.txt',
			'dir1/dir2/index.jsonl',
			'dir1/dir2/index.txt',
			'dir1/index.jsonl',
			'dir1/index.txt',
			'index.jsonl',
			'index.txt'
		])
	})

	it("returns empty array when updating index files themselves", () => {
		const db = { dirname, resolveSync }

		const indexRoot = DirectoryIndex.getIndexesToUpdate(db, 'index.txt')
		const indexFull = DirectoryIndex.getIndexesToUpdate(db, 'index.jsonl')
		const indexDir = DirectoryIndex.getIndexesToUpdate(db, 'dir1/index.txt')

		assert.deepStrictEqual(indexRoot, [
			"index.jsonl", "index.txt"
		])
		assert.deepStrictEqual(indexFull, [
			"index.jsonl", "index.txt"
		])
		assert.deepStrictEqual(indexDir, [
			"dir1/index.jsonl", "dir1/index.txt", "index.jsonl", "index.txt"
		])
	})
})

describe("DirectoryIndex", () => {
	it("constructs with default values", () => {
		const index = new DirectoryIndex()
		assert.strictEqual(index.entriesAs, DirectoryIndex.ENTRIES_AS_ARRAY)
		assert.strictEqual(index.maxEntriesOnLoad, 12)
		assert.deepStrictEqual(index.entries, [])
		assert.deepStrictEqual(index.entriesColumns, DirectoryIndex.COLUMNS)
	})

	it("constructs with custom values", () => {
		const entries = [["test", new DocumentStat({ size: 100 })]]
		const index = new DirectoryIndex({
			entries,
			entriesColumns: ["name", "size"],
			entriesAs: "object",
			maxEntriesOnLoad: 24
		})
		assert.strictEqual(index.entriesAs, DirectoryIndex.ENTRIES_AS_OBJECT)
		assert.strictEqual(index.maxEntriesOnLoad, 24)
		assert.deepStrictEqual(index.entries, entries)
		assert.deepStrictEqual(index.entriesColumns, ["name", "size"])
	})

	it("encodes entries as object (default)", () => {
		const index = new DirectoryIndex({ entries: [["F", "file.txt", "meaf0000", "99"]] })
		const encoded = index.encode({ target: "object" })
		const map = new Map(encoded)
		const stat = map.get("file.txt")
		assert.deepStrictEqual(stat.mtime.toISOString().slice(0, 10), "2025-08-13")
	})
})

describe("DirectoryIndex - decode", () => {
	it("decodes from array format", () => {
		const source = [["F", "file.txt", "1625097600000", "100"]]
		const index = new DirectoryIndex({
			entriesColumns: ["type", "name", "mtimeMs", "size"],
			entriesAs: "array"
		})
		const decoded = index.decode(source)
		assert.strictEqual(decoded[0][0], "file.txt")
		assert.strictEqual(decoded[0][1].size, 100)
		assert.strictEqual(decoded[0][1].mtimeMs, 1625097600000)
		assert.strictEqual(decoded[0][1].isFile, true)
	})

	it("decodes from rows format", () => {
		const source = ["F file.txt 1625097600000 100"]
		const index = new DirectoryIndex({
			entriesColumns: ["type", "name", "mtimeMs", "size"],
			entriesAs: "rows"
		})
		const decoded = index.decode(source)
		assert.strictEqual(decoded[0][0], "file.txt")
		assert.strictEqual(decoded[0][1].size, 100)
		assert.strictEqual(decoded[0][1].mtimeMs, 1625097600000)
		assert.strictEqual(decoded[0][1].isFile, true)
	})

	it("decodes from text format", () => {
		const source = "F file.txt 1625097600000 100"
		const index = new DirectoryIndex({
			entriesColumns: ["type", "name", "mtimeMs", "size"],
			entriesAs: "text",
			entries: source
		})
		const decoded = index.decode(source)
		assert.strictEqual(decoded[0][0], "file.txt")
		assert.strictEqual(decoded[0][1].size, 100)
		assert.strictEqual(decoded[0][1].mtimeMs, 1625097600000)
		assert.strictEqual(decoded[0][1].isFile, true)
	})

	it("decodes with radix notation in columns", () => {
		const source = [["F", "file.txt", "mecvlwg9", "8c"]]
		const index = new DirectoryIndex({
			entriesColumns: ["type", "name", "mtimeMs.36", "size.36"],
			entriesAs: "array"
		})
		const decoded = index.decode(source)
		assert.strictEqual(decoded[0][0], "file.txt")
		assert.strictEqual(decoded[0][1].mtime.toISOString().slice(0, 10), "2025-08-15")
		assert.strictEqual(decoded[0][1].size, 300)
		assert.strictEqual(decoded[0][1].isFile, true)
	})

	it("throws error when decoding text from non-string source", () => {
		const index = new DirectoryIndex({ entries: "", entriesAs: "text" })
		assert.throws(() => {
			index.decode(123)
		}, TypeError)
	})

	it("throws error when decoding array formats from non-array source", () => {
		const index = new DirectoryIndex({ entriesAs: "array" })
		assert.throws(() => {
			index.decode("not an array")
		}, TypeError)
	})
})

describe("DirectoryIndex - encode validation", () => {
	it("correctly encodeIntoArray entries", () => {
		const index = new DirectoryIndex({ entriesColumns: ["name", "mtimeMs", "size"] })
		const entries = [["dir/file.txt", new DocumentStat()]]
		const rows = index.encode({ entries, target: DirectoryIndex.ENTRIES_AS_ROWS })
		assert.ok(index)
		assert.deepStrictEqual(rows, ["dir/file.txt 0 0"])
		// assert.deepStrictEqual(rows, [["dir/file.txt", "0", "0"]])
	})

	it("throws error when encoding as array with less than 2 columns", () => {
		const index = new DirectoryIndex({ entriesColumns: ["name"] })
		assert.throws(() => {
			index.encodeIntoArray([])
		}, TypeError)
	})

	it("throws error when encoding as array without name column", () => {
		const index = new DirectoryIndex({ entriesColumns: ["size", "mtimeMs"] })
		assert.throws(() => {
			index.encodeIntoArray([])
		}, TypeError)
	})

	it("throws error when encoding as array without mtimeMs column", () => {
		const index = new DirectoryIndex({ entriesColumns: ["name", "size"] })
		assert.throws(() => {
			index.encodeIntoArray([])
		}, TypeError)
	})

	it("throws error when encoding with incorrect radix", () => {
		const index = new DirectoryIndex({ entriesColumns: ["name", "mtimeMs.99"] })
		assert.throws(() => {
			index.encodeIntoArray([["test", new DocumentStat({ mtimeMs: 123 })]])
		}, TypeError)
	})
})

describe("DirectoryIndex - static methods", () => {
	it("from() creates instance from array input", () => {
		const entries = [["F", "test.txt", "99", "9"]]
		const index = DirectoryIndex.from(entries)
		assert.ok(index instanceof DirectoryIndex)
		const found = index.entries.find(([uri]) => uri === "test.txt") ?? null
		assert.deepStrictEqual(found[0], "test.txt")
		assert.deepStrictEqual(found[1].mtimeMs, 333)
		assert.deepStrictEqual(found[1].size, 9)
	})

	it("from() returns existing instance when passed DirectoryIndex", () => {
		const existing = new DirectoryIndex()
		const index = DirectoryIndex.from(existing)
		assert.strictEqual(index, existing)
	})

	it("isIndex() correctly identifies index files", () => {
		assert.ok(DirectoryIndex.isIndex("index.txt"))
		assert.ok(DirectoryIndex.isIndex("dir/index.txt"))
		assert.ok(!DirectoryIndex.isIndex("file.txt"))
		assert.ok(!DirectoryIndex.isIndex("index.json"))
	})

	it("isFullIndex() correctly identifies full index files", () => {
		assert.ok(DirectoryIndex.isFullIndex("index.jsonl"))
		assert.ok(DirectoryIndex.isFullIndex("dir/index.jsonl"))
		assert.ok(!DirectoryIndex.isFullIndex("index.txt"))
		assert.ok(!DirectoryIndex.isFullIndex("file.jsonl"))
	})
})

describe("encodeComponent", () => {
	it("correctly encodes special characters", () => {
		const index = new DirectoryIndex()
		assert.strictEqual(index.encodeComponent("file name.txt"), "file%20name.txt")
		assert.strictEqual(index.encodeComponent("file@1.txt"), "file%401.txt")
	})
})

describe("DirectoryIndex.Filter", () => {
	it("should create an instance from", () => {
		const filter = DirectoryIndex.Filter.from({})
		assert.ok(filter instanceof DirectoryIndex.Filter)
	})
})
