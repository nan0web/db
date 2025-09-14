import { suite, describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { NoConsole } from '@nan0web/log'
import BaseDB, { DocumentEntry, DocumentStat, StreamEntry } from '../index.js'
import { GetOptions, FetchOptions } from "./index.js"

const defaultStructure = [
	["_", { global: 'value' }],
	["dir1/_", { a: 1 }],
	["dir1/dir2/_", { b: 2 }],
	["test.json", { value: "test" }],
	["parent.json", { parent: "value" }],
	["child.json", { $ref: 'parent.json', child: 'value' }],
	["ref.json", { prop: { subprop: 'resolved' } }],
	["data.json", { key: '$ref:ref.json#prop/subprop' }],
]

class DB extends BaseDB {
	accessLevels = []
	async ensureAccess(uri, level = 'r') {
		this.accessLevels.push({ uri, level })
		if (!['r', 'w', 'd'].includes(level)) {
			throw new TypeError([
				"Access level must be one of [r, w, d]",
				"r = read",
				"w = write",
				"d = delete",
			].join("\n"))
		}
		return true
	}
}

suite("DB", () => {
	/** @type {DB} */
	let db

	beforeEach(async () => {
		db = new DB({ predefined: defaultStructure })
		await db.connect()
	})

	describe('constructor', () => {
		it('should create instance with default values', () => {
			assert.strictEqual(db.root, '.')
			assert.strictEqual(db.cwd, '.')
			assert.strictEqual(db.connected, true)
			assert.ok(db.data instanceof Map)
			assert.ok(db.meta instanceof Map)
			assert.deepStrictEqual(db.dbs, [])
		})

		it('should initialize from input object', () => {
			const data = new Map([['test', 'value']])
			const meta = new Map([['test', new DocumentStat({ size: 100 })]])
			const dbs = [new DB({ root: 'test1' }), new DB({ root: 'test2' })]

			const dbInstance = new DB({
				root: '/root',
				cwd: '/cwd',
				connected: true,
				data,
				meta,
				dbs
			})

			assert.strictEqual(dbInstance.root, '/root')
			assert.strictEqual(dbInstance.cwd, '/cwd')
			assert.strictEqual(dbInstance.connected, true)
			assert.strictEqual(dbInstance.data.get('test'), 'value')
			assert.strictEqual(dbInstance.meta.get('test').size, 100)
			assert.strictEqual(dbInstance.dbs.length, 2)
		})
	})

	describe('get loaded', () => {
		it('should return false when not loaded', () => {
			assert.strictEqual(db.loaded, false)
		})

		it('should return true when loaded', () => {
			db.meta.set('?loaded', new DocumentStat({ mtimeMs: Date.now() }))
			assert.strictEqual(db.loaded, true)
		})
	})

	describe('attach and detach', () => {
		let db1, db2

		beforeEach(() => {
			db1 = new DB()
			db2 = new DB()
		})

		it('should attach a DB instance', () => {
			db.attach(db1)
			assert.strictEqual(db.dbs.length, 1)
			assert.strictEqual(db.dbs[0], db1)
		})

		it('should throw TypeError when attaching a non-DB instance', () => {
			assert.throws(() => db.attach({}), TypeError)
		})

		it('should detach an existing DB instance', () => {
			db.attach(db1)
			const result = db.detach(db1)
			assert.strictEqual(result.length, 1)
			assert.strictEqual(result[0], db1)
			assert.strictEqual(db.dbs.length, 0)
		})

		it('should return false when detaching a non-existent DB instance', () => {
			const result = db.detach(db1)
			assert.strictEqual(result, false)
			assert.strictEqual(db.dbs.length, 0)
		})

		it('should detach one of multiple attached DBs', () => {
			db.attach(db1)
			db.attach(db2)
			assert.strictEqual(db.dbs.length, 2)
			const result = db.detach(db1)
			assert.strictEqual(result.length, 1)
			assert.strictEqual(result[0], db1)
			assert.strictEqual(db.dbs.length, 1)
			assert.strictEqual(db.dbs[0], db2)
		})
	})

	describe('extract', () => {
		it('should create new DB with subset of data', async () => {
			const mockData = new Map([
				['root/dir/file1.txt', 'content1'],
				['root/dir/file2.txt', 'content2'],
				['root/other.txt', 'other']
			])
			const mockMeta = new Map([
				['root/dir/file1.txt', new DocumentStat({ size: 100 })],
				['root/dir/file2.txt', new DocumentStat({ size: 200 })],
				['root/other.txt', new DocumentStat({ size: 300 })]
			])

			const db = new DB({
				root: '/root',
				data: mockData,
				meta: mockMeta,
			})

			const extracted = db.extract('dir/')
			const file1 = await extracted.loadDocument("file1.txt", "")
			const file2 = await extracted.fetch("file2.txt")
			assert.strictEqual(extracted.root, '/root/dir/')
			assert.strictEqual(extracted.data.size, 2)
			assert.strictEqual(extracted.meta.size, 2)
			assert.strictEqual(file1, "content1")
			assert.strictEqual(file2, "content2")
			assert.ok(extracted.data.has('root/dir/file1.txt'))
			assert.ok(extracted.data.has('root/dir/file2.txt'))
			assert.ok(!extracted.data.has('root/other.txt'))
		})
	})

	describe('extname', () => {
		it('should return extension with dot', () => {
			assert.strictEqual(db.extname('file.txt'), '.txt')
			assert.strictEqual(db.extname('archive.tar.gz'), '.gz')
		})

		it('should return empty string if no extension', () => {
			assert.strictEqual(db.extname('filename'), '')
		})

		it('should handle empty string', () => {
			assert.strictEqual(db.extname(''), '')
		})
	})

	describe('relative', () => {
		it('should return uri if from and to are absolute and from starts with to', async () => {
			const result = db.relative("/root/api", "/root/")
			assert.strictEqual(result, "api")
		})

		it('should return uri if from and to are absolute and from do not starts with to', async () => {
			const result = db.relative("/root/api", "/root2/")
			assert.strictEqual(result, "/root2/")
		})

		it('should return uri if to is relative', async () => {
			const result = db.relative("root/api", "/root2/")
			assert.strictEqual(result, "/root2/")
		})
	})

	describe('toString', () => {
		it('should return formatted string representation', () => {
			const dbInstance = new DB({ root: '/test' })
			assert.match(dbInstance.toString(), /^DB \/test \[utf-8\]$/)
		})
	})

	describe('readDir', () => {
		it('should return empty array for no directory', async () => {
			const baseDb = new DB()
			const fn = async () => {
				const result = []
				for await (const some of baseDb.readDir('path')) {
					// consume generator
					result.push(some)
				}
				return result
			}
			const result = await fn()
			assert.equal(result.length, 0)
		})

		it('should yield directory entries', async () => {
			const db = new DB({
				predefined: [
					['file1.txt', 'content1'],
					['file2.txt', 'content2']
				]
			})
			await db.connect()

			const entries = []
			for await (const entry of db.readDir('.', { depth: 0 })) {
				entries.push(entry)
			}

			assert.strictEqual(entries.length, 2)
			assert.ok(entries[0] instanceof DocumentEntry)
			assert.ok(entries[1] instanceof DocumentEntry)
		})

		it('should read recursively with depth > 0', async () => {
			const db = new DB({
				predefined: [
					['dir1/file1.txt', 'content1'],
					['dir1/dir2/file2.txt', 'content2'],
					['dir1/dir2/dir3/file3.txt', 'content3']
				]
			})
			await db.connect()

			const entries = []
			for await (const entry of db.readDir('.', { depth: 3 })) {
				entries.push(entry)
			}

			assert.strictEqual(entries.length, 3)
			assert.ok(entries.find(e => e.path === 'dir1/file1.txt'))
			assert.ok(entries.find(e => e.path === 'dir1/dir2/file2.txt'))
			assert.ok(entries.find(e => e.path === 'dir1/dir2/dir3/file3.txt'))
		})

		it('should read index.jsonl at depth 0', async () => {
			const db = new DB({
				predefined: [
					['index.jsonl',
						[
							{ type: 'F', path: 'file.json', mtimeMs: 1_000_000_000_000, size: 100 },
							{ type: 'F', path: 'dir/sub.json', mtimeMs: 1_000_000_000_000, size: 200 }
						]
					]
				]
			})
			await db.connect()

			const entries = []
			for await (const entry of db.readDir('.')) {
				entries.push(entry)
			}

			assert.strictEqual(entries.length, 2)
			assert.ok(entries.find(e => e.path === 'file.json'))
			assert.ok(entries.find(e => e.path === 'dir/sub.json'))
		})

		it('should read index.txt at depth 0', async () => {
			const db = new DB({
				predefined: [
					['index.txt', 'F file1.txt mecxlwg9 8x\nF file2.txt mecvlwg9 8c']
				]
			})
			await db.connect()

			const entries = []
			for await (const entry of db.readDir('.', { depth: 0 })) {
				entries.push(entry)
			}

			assert.strictEqual(entries.length, 2)
			assert.ok(entries.find(e => e.path === 'file1.txt'))
			assert.ok(entries.find(e => e.path === 'file2.txt'))
		})

		it('should read with depth 1 to include subdirectories', async () => {
			const db = new DB({
				predefined: [
					['dir1/index.txt', 'F file1.txt mecxlwg9 8x\nF file2.txt mecvlwg9 8c\nD subdir/ mecvlwg9 0'],
					['dir1/subdir/index.txt', 'F nested.json mecxlwg9 8x'],
					['dir1/file1.txt', 'content1'],
					['dir1/file2.txt', 'content2'],
					['dir1/subdir/nested.json', 'content3']
				]
			})
			await db.connect()

			const entries = []
			for await (const entry of db.readDir('dir1', { depth: 1 })) {
				entries.push(entry)
			}

			assert.ok(entries.length >= 3)
			assert.ok(entries.find(e => e.path === 'dir1/file1.txt'))
			assert.ok(entries.find(e => e.path === 'dir1/file2.txt'))
			assert.ok(entries.find(e => e.path === 'dir1/subdir/nested.json'))
		})

		it('should read with skipStat option', async () => {
			const db = new DB({
				predefined: [
					['file1.txt', 'content1'],
					['file2.txt', 'content2']
				]
			})
			await db.connect()

			const entries = []
			for await (const entry of db.readDir('.', { depth: 0, skipStat: true })) {
				entries.push(entry)
			}

			assert.strictEqual(entries.length, 2)
			assert.ok(entries.find(e => e.path === 'file1.txt'))
			assert.ok(entries.find(e => e.path === 'file2.txt'))
		})

		it('should respect filter function', async () => {
			const db = new DB({
				predefined: [
					['file1.txt', 'content1'],
					['file2.json', 'content2'],
					['file3.md', 'content3']
				]
			})
			await db.connect()

			const entries = []
			for await (const entry of db.readDir('.', {
				depth: 0,
				filter: (entry) => entry.path.endsWith('.txt')
			})) {
				entries.push(entry)
			}

			assert.strictEqual(entries.length, 1)
			assert.ok(entries.find(e => e.path === 'file1.txt'))
		})

	})

	describe('readBranch', () => {
		it('should return async generator', async () => {
			const result = await db.readBranch('path', 1)
			assert.ok(result[Symbol.asyncIterator])
		})
	})

	describe('requireConnected', () => {
		it('should connect if not connected', async () => {
			const db = new DB()
			assert.strictEqual(db.connected, false)
			await db.requireConnected()
			assert.strictEqual(db.connected, true)
		})

		it('should throw error if connection fails', async () => {
			const failingDb = new DB()
			failingDb.connect = async () => {
				failingDb.connected = false
			}

			await assert.rejects(async () => {
				await failingDb.requireConnected()
			}, /DB is not connected/)
		})
	})

	describe('find', () => {
		it('should yield specific URI if found', async () => {
			const dbInstance = new DB({ data: new Map([['test.txt', 'content']]) })
			await dbInstance.connect()
			dbInstance.meta.set("?loaded", new DocumentStat({ mtimeMs: 1_000 }))

			const results = []
			for await (const uri of dbInstance.find('test.txt')) {
				results.push(uri)
			}

			assert.deepStrictEqual(results, ['test.txt'])
		})

		it.todo('should yield URIs matching function (loaded version)', async () => {
			const mockData = new Map([
				['file1.txt', 'content1'],
				['file2.md', 'content2'],
				['file3.txt', 'content3']
			])
			const dbInstance = new DB({ data: mockData })
			await dbInstance.connect()
			dbInstance.meta.set("?loaded", new DocumentStat({ mtimeMs: 1_000 }))

			const results = []
			for await (const entry of dbInstance.find((key) => key.endsWith('.txt'))) {
				results.push(entry)
			}

			assert.deepStrictEqual(results, ['file1.txt', 'file3.txt'])
		})

		it.todo('should yield URIs matching function (fs version)', async () => {
			const mockData = new Map([
				['file1.txt', 'content1'],
				['file2.md', 'content2'],
				['file3.txt', 'content3']
			])
			const dbInstance = new DB({ data: mockData })
			dbInstance.meta.set("?loaded", new DocumentStat())

			const results = []
			for await (const entry of dbInstance.find((key) => key.endsWith('.txt'))) {
				results.push(entry)
			}

			assert.deepStrictEqual(results, ['file1.txt', 'file3.txt'])
		})
	})

	describe('connect', () => {
		it('should set connected to true', async () => {
			assert.strictEqual(db.connected, true)
		})
	})

	describe('get', () => {
		it('should load document if not in cache', async () => {
			const dbInstance = new DB({ data: new Map([['test.txt', 'content']]) })

			const result = await dbInstance.get('test.txt')
			assert.strictEqual(result, 'content')
		})
	})

	describe('set', () => {
		it('should set data and update metadata', async () => {
			const result = await db.set('test.txt', 'content')
			assert.strictEqual(result, 'content')
			assert.ok(db.data.has('test.txt'))
			assert.ok(db.meta.has('test.txt'))
		})
	})

	describe('stat', () => {
		it('should get document statistics', async () => {
			const stat = new DocumentStat({ size: 100, isFile: true })
			const dbInstance = new DB({ meta: new Map([['test.txt', stat]]) })

			const result = await dbInstance.stat('test.txt')
			assert.strictEqual(result.size, 100)
			assert.strictEqual(result.isFile, true)
		})
	})

	describe('resolve', () => {
		it("should resolve the path", async () => {
			const path = await db.resolve("a/b", "c")
			assert.equal(path, "a/b/c")
		})
		it("should resolve / directories", async () => {
			const path = await db.resolve("api", "/users")
			assert.equal(path, "users")
		})
		it("should resolve .. directories", async () => {
			const path = await db.resolve("api/v1/", "../users")
			assert.equal(path, "api/users")
		})
		it("should resolve .. in 3 args", async () => {
			const path = await db.resolve("api/v1", "..", "users")
			assert.equal(path, "users")
		})

		it.skip("should not resolve .. beyond root", async () => {
			// Test cases for ../ resolution behavior at root level
			const testCases = [
				{ args: ["/", "..", "_"], expected: "_" },
				{ args: ["/path", "..", "_"], expected: "path/_" },
				{ args: ["/deeply/nested/path", "..", "_"], expected: "deeply/nested/path/_" },
				{ args: ["_", "..", "_"], expected: "_/_" },
				{ args: ["playground/_", "..", "_"], expected: "playground/_/_" },
				{ args: ["/playground/_", "..", "_"], expected: "playground/_/_" },
			]

			for (const { args, expected } of testCases) {
				const result = await db.resolve(...args)
				assert.equal(result, expected, `Failed for args: ${JSON.stringify(args)}`)
			}
		})

		it.skip("should prevent same path resolution for parent", async () => {
			const testCases = [
				{ from: "playground/_", to: "..", expected: "_" },
				{ from: "/playground/_", to: "..", expected: "_" },
				{ from: "_", to: "..", expected: "." },
			]

			for (const { from, to, expected } of testCases) {
				const result = await db.resolve(from, to, "_")
				assert.equal(result, expected, `Failed for from: ${from}, to: ${to}`)
			}
		})
	})

	describe('absolute', () => {
		it('should throw not implemented error', () => {
			const db = new DB()
			const abs = db.absolute('path')

			assert.equal(abs, "/path")
		})
	})

	describe('loadDocument', () => {
		it('should return default value if document not found', async () => {
			const uri = 'doc.txt'
			const result = await db.loadDocument(uri, "")
			assert.strictEqual(result, "")
		})

		it('should return document if found', async () => {
			const uri = 'doc.txt'
			const content = 'document content'
			db.data.set(uri, content)
			const result = await db.loadDocument(uri)
			assert.strictEqual(result, content)
		})

		it('should try extensions when none provided', async () => {
			const db = new DB({
				predefined: [
					['file.json', { value: 'found' }]
				]
			})
			await db.connect()

			const result = await db.loadDocument('file')
			assert.deepStrictEqual(result, { value: 'found' })
		})
	})

	describe('saveDocument', () => {
		it('should call ensureAccess [w]rite and return false', async () => {
			const uri = 'doc.txt'
			const result = await db.saveDocument(uri, 'data')
			assert.strictEqual(result, false)
		})
	})

	describe('statDocument', () => {
		it('should return empty stat for not implemented function and empty meta map', async () => {
			const baseDb = new DB()
			const stat = await baseDb.statDocument('path')
			assert.ok(!stat.exists)
		})
	})

	describe('writeDocument', () => {
		it('should call ensureAccess with w and return false', async () => {
			const uri = 'doc.txt'
			const result = await db.writeDocument(uri, 'chunk')
			assert.strictEqual(result, false)
		})
	})

	describe('dropDocument', () => {
		it('should call ensureAccess with d and return false', async () => {
			const uri = 'doc.txt'
			const result = await db.dropDocument(uri)
			assert.strictEqual(result, false)
		})
	})

	describe('moveDocument', () => {
		it('should call ensureAccess for from and to, and loadConfig', async () => {
			const from = 'from.txt'
			const to = 'to.txt'
			db.data.set(from, 'test content')
			const result = await db.moveDocument(from, to)
			assert.strictEqual(result, true)
		})
	})

	describe('ensureAccess', () => {
		it('should return true for valid levels', async () => {
			assert.strictEqual(await db.ensureAccess('uri', 'r'), true)
			assert.strictEqual(await db.ensureAccess('uri', 'w'), true)
			assert.strictEqual(await db.ensureAccess('uri', 'd'), true)
		})

		it('should throw error for invalid level', async () => {
			await assert.rejects(() => db.ensureAccess('uri', 'x'), /Access level must be one of \[r, w, d\]/)
		})
	})

	describe('push', () => {
		it('should call ensureAccess for all documents', async () => {
			const mockData = new Map([
				['file1.txt', 'content1'],
				['file2.txt', 'content2']
			])
			const mockMeta = new Map([
				['file1.txt', new DocumentStat({ mtimeMs: 1_000 })],
				['file2.txt', new DocumentStat({ mtimeMs: 1_000 })],
			])
			const dbInstance = new DB({ data: mockData, meta: mockMeta })

			await dbInstance.push()

			assert.ok(dbInstance.accessLevels.find(a => a.uri === 'file1.txt' && a.level === 'w'))
			assert.ok(dbInstance.accessLevels.find(a => a.uri === 'file2.txt' && a.level === 'w'))
		})

		it('should call ensureAccess for specific document', async () => {
			const db = new DB()
			await db.connect()
			await db.push('specific.txt')

			assert.ok(db.accessLevels.find(a => a.uri === 'specific.txt' && a.level === 'w'))
		})
	})

	describe('disconnect', () => {
		it('should set connected to false', async () => {
			db.connected = true
			await db.disconnect()
			assert.strictEqual(db.connected, false)
		})
	})

	describe('findStream', () => {
		it('should yield StreamEntry objects', async () => {
			const db = new DB({
				predefined: [
					['test.txt', 'content']
				]
			})
			await db.connect()

			const entries = []
			for await (const entry of db.findStream('.')) {
				entries.push(entry)
			}

			assert.ok(entries[0] instanceof StreamEntry)
		})

		it('should correctly populate top entries', async () => {
			const db = new DB({
				predefined: [
					['file1.txt', 'content1'],
					['file2.txt', 'content2'],
					['subdir/', null],
					['subdir/file3.txt', 'content3'],
					['subdir/nested/', null],
					['subdir/nested/file4.txt', 'content4']
				]
			})
			await db.connect()

			const entries = []
			for await (const entry of db.findStream('.', { depth: 2 })) {
				entries.push(entry)
			}

			assert.ok(entries.length > 0)
			// Check that top map includes top-level entries
			const last = entries[entries.length - 1]
			assert.ok(last.top.has('file1.txt'))
			assert.ok(last.top.has('file2.txt'))
			// Check that it doesn't include deeper entries
			assert.ok(!last.top.has('subdir/file3.txt'))
			assert.ok(!last.top.has('subdir/nested/'))
		})

	})

	describe('from', () => {
		it('should return existing instance if DB', () => {
			const existing = new DB()
			const result = DB.from(existing)
			assert.strictEqual(result, existing)
		})

		it('should create new instance from object', () => {
			const props = { root: '/test' }
			const result = DB.from(props)
			assert.ok(result instanceof DB)
			assert.strictEqual(result.root, '/test')
		})
	})

	describe('getInheritance', () => {
		it('should get inheritance data for path', async () => {
			const db = new DB({
				console: new NoConsole({ silent: false }),
				predefined: [
					['_.json', { global: 'value' }],
					['dir1/_.json', { a: 1 }],
					['dir1/dir2/_', { b: 2 }],
				]
			})
			await db.connect()

			const result = await db.getInheritance('dir1/dir2/file')
			assert.deepEqual(result, { global: 'value', a: 1, b: 2 })
			// assert.deepEqual(db.console.output(), [])
		})

		it('should handle missing inheritance files', async () => {
			const db = new DB({
				predefined: [
					['_', { global: 'value' }],
					["dir1/_", { a: 1 }],
					["dir1/dir2/_", { b: 2 }],
				]
			})
			await db.connect()

			const result = await db.getInheritance('dir1/dir2/file')
			// a: 1 comes from dir1/_
			// b: 2 comes from dir1/dir2/_
			assert.deepEqual(result, { a: 1, b: 2, global: 'value' })
		})

		it('should cache inheritance data', async () => {
			const db = new DB({
				predefined: [
					['_', { global: 'value' }],
					['dir1/_', { a: 1 }],
				]
			})
			await db.connect()

			const result1 = await db.getInheritance('dir1/file')
			const result2 = await db.getInheritance('dir1/file2')

			assert.deepEqual(result1, { global: 'value', a: 1 })
			assert.deepEqual(result2, { global: 'value', a: 1 })
			assert.ok(db._inheritanceCache.has('/'))
			assert.ok(db._inheritanceCache.has('dir1/'))
		})
	})

	describe('getGlobals', () => {
		it('should get global variables from _ directory', async () => {
			const dbInstance = new DB()
			// Set up a directory structure with _/ subdirectory
			const globalsUri = '_/langs'
			dbInstance.data.set(globalsUri, ['en', 'uk'])

			// Set up a file that would access these globals
			const fileUri = 'some/deep/path/file.txt'

			const result = await dbInstance.getGlobals(fileUri)
			assert.deepEqual(result, {})
		})

		it('should handle _ directory being file', async () => {
			const db = new DB({
				predefined: [
					['_/currencies', ["BTC"]],
					['dir1/_/currencies', ["BTC", "UAH"]],
					['dir1/dir2/_/currencies', ["USD"]],
				],
				console: new NoConsole()
			})
			await db.connect()
			const r1 = await db.getGlobals('dir1/dir2/some-file.txt')
			assert.deepEqual(r1, { currencies: ["USD"] })
			const r2 = await db.getGlobals('dir1/some-file.txt')
			assert.deepEqual(r2, { currencies: ["BTC", "UAH"] })
			const r3 = await db.getGlobals('some-file.txt')
			assert.deepEqual(r3, { currencies: ["BTC"] })
			const r4 = await db.getGlobals('another/some-file.txt')
			assert.deepEqual(r4, { currencies: ["BTC"] })
		})

		it('should return empty object when no globals found', async () => {
			const dbInstance = new DB()
			const result = await dbInstance.getGlobals('any/file/path')
			assert.deepEqual(result, {})
		})

		it("should properly load t.json", async () => {
			const db = new DB({
				predefined: [
					["uk/_/t.json", {
						"Translation": "Pereklad",
					}],
					["uk/index.json", {
						"title": "Holovna"
					}]
				]
			})
			await db.connect()
			const data = await db.fetch("uk/index")
			assert.deepEqual(data, {
				title: "Holovna",
				t: {
					"Translation": "Pereklad"
				}
			})
		})
	})

	describe.skip('fetch', () => {
		it('should fetch merged data with all options enabled', async () => {
			const dbInstance = new DB()
			dbInstance.data.set('_', { global: 'value' })
			dbInstance.data.set('test.json', { value: 'test' })

			const opts = new FetchOptions()
			const result = await dbInstance.fetch('test.json', opts)
			assert.deepEqual(result, { global: 'value', value: 'test' })
		})

		it('should fetch with extension processing', async () => {
			const dbInstance = new DB()
			dbInstance.data.set('_', { global: 'value' })
			dbInstance.data.set('parent.json', { parent: 'value' })
			dbInstance.data.set('child.json', { $ref: 'parent.json', child: 'value' })

			const opts = new FetchOptions()
			const result = await dbInstance.fetch('child.json', opts)
			assert.deepEqual(result, { global: 'value', parent: 'value', child: 'value' })
		})

		it('should fetch with reference resolution', async () => {
			const dbInstance = new DB()
			dbInstance.data.set('_', { global: 'value' })
			dbInstance.data.set('ref.json', { prop: { subprop: 'resolved' } })
			dbInstance.data.set('data.json', { key: '$ref:ref.json#prop/subprop' })

			const opts = new FetchOptions()
			const result = await dbInstance.fetch('data.json', opts)
			assert.deepEqual(result, { global: 'value', key: 'resolved' })
		})

		it('should return default value when document not found', async () => {
			const db = new DB()
			const opts = new FetchOptions({ defaultValue: { value: 'default' } })
			const result = await db.fetch('missing.json', opts)
			assert.deepEqual(result, { value: 'default' })
		})

		it('should handle directory access when allowDirs is true (default)', async () => {
			const db = new DB({
				predefined: [
					['dir/index.json', { title: 'Directory Index' }]
				]
			})
			await db.connect()
			const result = await db.fetch('dir')
			assert.deepEqual(result, { title: 'Directory Index' })
		})

		it('should load globals properly when globals option is true (default)', async () => {
			const db = new DB({
				predefined: [
					['_', { global: 'value' }],
					['_/langs', ['en', 'uk']],
					['test.json', { value: 'test' }],
				]
			})
			await db.connect()
			const result = await db.fetch('test.json')
			assert.deepEqual(result, { global: 'value', value: 'test', langs: ['en', 'uk'] })
		})

		it("should not go into infinite loop", async () => {
			const db = new DB({
				predefined: [
					["_", { "nav": [{ href: "index.html", title: "Home" }] }],
					["typography.json", { "$content": [{ h1: "Typography" }] }],
				]
			})
			await db.connect()
			const result = await db.fetch("typography.json")
			assert.deepEqual(result, {
				nav: [{ href: "index.html", title: "Home" }],
				$content: [{ h1: "Typography" }]
			})
		})

		it.skip("should handle circular references without infinite loop", async () => {
			const db = new DB({
				predefined: [
					["_", {
						nav: [
							{ href: "/playground/index.html", title: "Home" },
							{ href: "/playground/avatars.html", title: "Avatar" },
							{ href: "/playground/buttons.html", title: "Button" },
							{ href: "/playground/typography.html", title: "Typography" }
						]
					}],
					["playground/index.json", {
						$content: [
							{ h1: "NaN•Web UI React Playground" },
							{
								ul: [
									{ a: "Avatar", $href: "/playground/avatars.json" },
									{ a: "Button", $href: "/playground/buttons.json" },
									{ a: "Typography", $href: "/playground/typography.json" }
								]
							}
						]
					}]
				]
			})
			await db.connect()
			const result = await db.fetch("playground/index.json")
			assert.ok(result.nav)
			assert.ok(result.$content)
			assert.equal(result.nav.length, 4)
			assert.equal(result.$content.length, 2)
		})

		it.skip("should not resolve to same path for inheritance", async () => {
			const db = new DB({
				predefined: [
					["playground/_", { theme: "light" }],
					["playground/index.json", { title: "Playground" }]
				]
			})
			await db.connect()

			// This should not cause infinite loop
			const result = await db.fetch("playground/index.json")
			assert.ok(result)
			assert.equal(result.title, "Playground")
			assert.equal(result.theme, "light")
		})
	})

	describe.skip('fetchMerged', () => {
		it('should fetch and merge data with all options', async () => {
			const db = new DB()
			db.data.set('_', { global: 'value' })
			db.data.set('test.json', { value: 'test' })
			const result = await db.fetch('test.json')
			assert.deepEqual(result, { global: 'value', value: 'test' })
		})

		it('should handle extension processing with inherit option', async () => {
			const db = new DB()
			db.data.set('_', { global: 'value' })
			db.data.set('parent.json', { parent: 'value' })
			db.data.set('child.json', { $ref: 'parent.json', child: 'value' })
			const result = await db.fetch('child.json', { inherit: true })
			assert.deepEqual(result, { global: 'value', parent: 'value', child: 'value' })
		})

		it('should handle reference resolution with refs option', async () => {
			const db = new DB()
			db.data.set('_', { global: 'value' })
			db.data.set('ref.json', { prop: { subprop: 'resolved' } })
			db.data.set('data.json', { key: '$ref:ref.json#prop/subprop' })
			const result = await db.fetch('data.json', { refs: true })
			assert.deepEqual(result, { global: 'value', key: 'resolved' })
		})

		it('should skip globals when option is false', async () => {
			const db = new DB()
			db.data.set('_', { global: 'value' })
			db.data.set("_/langs", ["en", "uk"])
			db.data.set('test.json', { value: 'test' })
			const result = await db.fetch('test.json', { globals: false })
			assert.deepEqual(result, { global: 'value', value: 'test' })
		})

		it('should load globals', async () => {
			const db = new DB({
				predefined: [
					['_', { global: 'value' }],
					["_/langs", ["en", "uk"]],
					['test.json', { value: 'test' }],
				]
			})
			await db.connect()
			const result = await db.fetch('test.json')
			assert.deepEqual(result, { global: "value", value: 'test', langs: ["en", "uk"] })
		})

		it('should skip extension processing when refs option is false', async () => {
			const db = new DB({
				predefined: [
					['parent.json', { parent: 'value' }],
					['child.json', { $ref: 'parent.json', child: 'value' }],
				]
			})
			await db.connect()
			const result = await db.fetch('child.json', { refs: false })
			assert.deepEqual(result, { $ref: 'parent.json', child: 'value' })
		})

		it('should skip reference resolution when refs option is false', async () => {
			const db = new DB()
			db.data.set('ref.json', { prop: { subprop: 'resolved' } })
			db.data.set('data.json', { key: '$ref:ref:ref.json#prop/subprop' })

			const result = await db.fetch("data.json", { refs: false })
			assert.deepEqual(result, { key: '$ref:ref:ref.json#prop/subprop' })
		})

		it("should prevent circular inheritance", async () => {
			const db = new DB({
				predefined: [
					["playground/_", { theme: "light" }],
					["playground/index.json", { title: "Playground" }]
				]
			})
			await db.connect()
			// Mock the fetchMerged implementation to test circular inheritance handling
			const result = await db.fetch("playground/index.json")
			assert.ok(result)
			assert.equal(result.title, "Playground")
			assert.equal(result.theme, "light")
		})
	})

	describe('resolveReferences', () => {
		it.todo('should resolve simple references', async () => {
			const db = new DB({
				predefined: [
					['ref.json', 'referenced value']
				]
			})
			await db.connect()

			const result = await db.resolveReferences({ key: '$ref:ref.json' })
			assert.deepEqual(result, { key: 'referenced value' })
		})

		it('should resolve fragment references', async () => {
			const dbInstance = new DB()
			dbInstance.data.set('ref.json', { prop: { subprop: 'resolved' } })
			const data = { key: '$ref:ref.json#prop/subprop' }

			const result = await dbInstance.resolveReferences(data)
			assert.deepEqual(result, { key: 'resolved' })
		})

		it('should keep original value if reference cannot be resolved', async () => {
			const data = { key: '$ref:missing.json' }

			const result = await db.resolveReferences(data)
			assert.deepEqual(result, { key: '$ref:missing.json' })
		})

		it('should resolve nested references', async () => {
			const db = new DB()
			db.data.set('ref.txt', 'referenced value')
			const data = { nested: { key: '$ref:ref.txt' } }

			const result = await db.resolveReferences(data)
			assert.deepEqual(result, { nested: { key: 'referenced value' } })
		})

		it('should resolve nested references (property version)', async () => {
			const db = new DB({
				predefined: [
					['ref.json', 'referenced value']
				]
			})
			await db.connect()
			const data = { nested: { key: { $ref: 'ref.json' } } }

			const result = await db.resolveReferences(data)
			assert.deepEqual(result, { nested: { key: 'referenced value' } })
		})

		it('should resolve nested references (property version) with siblings', async () => {
			const db = new DB({
				predefined: [
					['ref.json', 'referenced value']
				]
			})
			await db.connect()
			const data = { nested: { key: { $ref: 'ref.json', color: "blue" } } }

			const result = await db.resolveReferences(data)
			assert.deepEqual(result, {
				nested: { key: { value: 'referenced value', color: "blue" } }
			})
		})

		it('should resolve nested references (property version) with siblings and object', async () => {
			const dbInstance = new DB()
			dbInstance.data.set('ref.json', { color: "red", size: "xl" })
			const data = { nested: { key: { $ref: 'ref.json', color: "blue" } } }

			const result = await dbInstance.resolveReferences(data)
			assert.deepEqual(result, {
				nested: { key: { size: "xl", color: "blue" } }
			})
		})
	})

	describe("normalize", () => {
		it("should normalize path with //", () => {
			const db = new DB()
			assert.equal(db.normalize("/root", "/dir", "file.txt"), "dir/file.txt")
			assert.equal(db.normalize("/root", "/dir", "..", "file.txt"), "file.txt")
			assert.equal(db.normalize("playground/_/", "..", "_"), "playground/_")
			assert.equal(db.normalize("playground/_", "..", "_"), "_")
		})
	})

	describe('processExtensions', () => {
		it('should process extension with $ref', async () => {
			const db = new DB({
				predefined: [
					['parent.json', { parent: 'value' }]
				]
			})
			await db.connect()
			const data = { [db.Data.REFERENCE_KEY]: 'parent.json', child: 'value' }

			// const result = await db.processExtensions(data)
			const result = await db.resolveReferences(data, "index.json")
			assert.deepEqual(result, { parent: 'value', child: 'value' })
		})

		it('should return data if no extension', async () => {
			const data = { key: 'value' }

			// const result = await db.processExtensions(data)
			const result = await db.resolveReferences(data)
			assert.deepEqual(result, { key: 'value' })
		})

		it('should keep data including $ref if extension cannot be resolved', async () => {
			const data = { $ref: 'missing.json', key: 'value' }

			// const result = await db.processExtensions(data)
			const result = await db.resolveReferences(data)
			assert.deepEqual(result, { $ref: 'missing.json', key: 'value' })
		})
	})

	describe("GetOptions", () => {
		it("should extension provide its values", async () => {
			class GetOptionsExtended extends GetOptions {
				defaultValue = ""
			}
			class DBExtended extends DB {
				static GetOptions = GetOptionsExtended
				async get(uri, opts = new this.GetOptions()) {
					opts = this.GetOptions.from(opts)
					return [opts.defaultValue, uri]
				}
			}
			const db = new DBExtended()
			const result = await db.get("anything")
			assert.deepEqual(result, ["", "anything"])
		})
	})

	describe("Circular Reference Handling", () => {
		it("should handle self-referencing documents without infinite loop", async () => {
			const db = new DB({
				console: new NoConsole(),
				predefined: [
					["self-ref.json", { $ref: "self-ref.json", value: "test" }]
				]
			})
			await db.connect()

			const result = await db.fetch("self-ref.json")
			assert.ok(result)
			assert.deepEqual(result, { $ref: "self-ref.json", value: "test" })
			assert.equal(result.value, "test")
		})

		it("should handle mutual circular references (extensions) without infinite loop", async () => {
			const db = new DB({
				console: new NoConsole(),
				predefined: [
					["doc-a.json", { $ref: "doc-b.json", a: true }],
					["doc-b.json", { $ref: "doc-a.json", b: true }]
				]
			})
			await db.connect()

			const resultA = await db.fetch("doc-a.json")
			const resultB = await db.fetch("doc-b.json")

			assert.deepEqual(resultA, { $ref: "doc-a.json", a: true, b: true })
			assert.deepEqual(resultB, { $ref: "doc-b.json", b: true, a: true })
		})
	})

	describe("listDir", () => {
		it('should list directory contents correctly', async () => {
			const db = new DB({
				predefined: [
					['dir/file1.txt', 'content1'],
					['dir/file2.txt', 'content2'],
					['other.txt', 'other']
				]
			})

			await db.connect()

			const entries = await db.listDir('dir')
			assert.strictEqual(entries.length, 2)
			assert.ok(entries.find(e => e.name === 'file1.txt'))
			assert.ok(entries.find(e => e.name === 'file2.txt'))
		})
	})

	describe('readDir with depth logic', () => {
		it('should load index.jsonl when depth=0', async () => {
			const db = new DB({
				predefined: [
					["index.jsonl",
						[
							{ type: "F", path: "file.json", mtimeMs: 1717459200000, size: 100, content: { this: "is something" } },
							{ type: "F", path: "dir/sub.json", mtimeMs: 1717459200000, size: 200, content: ["Here is a content"] },
						]
					]
				]
			})
			await db.connect()

			const entries = []
			for await (const entry of db.readDir(".")) {
				entries.push(entry)
			}

			assert.equal(entries.length, 2)
			assert.equal(entries[0].path, "file.json")
			assert.equal(entries[1].path, "dir/sub.json")
		})

		it('should load index.txt and go deeper when depth=1-3', async () => {
			const db = new DB({
				predefined: [
					["index.txt", "F file.json mecxlwg9 8x\nD subdir/ mecvlwg9 0"],
					["subdir/index.txt", "F nested.json mecxlwg9 8x"]
				]
			})
			await db.connect()

			const entries = []
			for await (const entry of db.readDir(".", { depth: 2 })) {
				entries.push(entry)
			}

			assert.ok(entries.find(e => e.path === "file.json" && e.isFile))
			assert.ok(entries.find(e => e.path === "subdir" && e.isDirectory))
			assert.ok(entries.find(e => e.path === "subdir/nested.json"))
		})

		it('should read directory contents recursively without index files', async () => {
			const db = new DB({
				predefined: [
					['dir1/file1.txt', 'content1'],
					['dir1/dir2/file2.txt', 'content2'],
					['dir1/dir2/dir3/file3.txt', 'content3'],
					['other.txt', 'other']
				]
			})
			await db.connect()

			const entries = []
			for await (const entry of db.readDir('dir1', { depth: 3 })) {
				entries.push(entry)
			}

			assert.strictEqual(entries.length, 3)
			assert.ok(entries.find(e => e.path === 'dir1/file1.txt'))
			assert.ok(entries.find(e => e.path === 'dir1/dir2/file2.txt'))
			assert.ok(entries.find(e => e.path === 'dir1/dir2/dir3/file3.txt'))
		})

		it('should read directory contents flat (depth=0) without index files', async () => {
			const db = new DB({
				predefined: [
					['flat/file1.txt', 'content1'],
					['flat/dir/file2.txt', 'content2'],
					['flat/dir/subdir/file3.txt', 'content3']
				]
			})
			await db.connect()

			const entries = []
			for await (const entry of db.readDir('flat', { depth: 0 })) entries.push(entry)

			assert.strictEqual(entries.length, 1)
			assert.ok(entries.find(e => e.path === 'flat/file1.txt'))
		})

		it('should read directory contents limited by depth without index files', async () => {
			const db = new DB({
				predefined: [
					['limited/file1.txt', 'content1'],
					['limited/dir/file2.txt', 'content2'],
					['limited/dir/subdir/file3.txt', 'content3']
				]
			})
			await db.connect()

			const entries = []
			for await (const entry of db.readDir('limited', { depth: 1 })) {
				entries.push(entry)
			}

			assert.strictEqual(entries.length, 2)
			assert.ok(entries.find(e => e.path === 'limited/file1.txt'))
			assert.ok(entries.find(e => e.path === 'limited/dir/file2.txt'))
		})
	})

	describe("basename", () => {
		it("should calculate file", () => {
			assert.equal(db.basename("some/url/with/a-file.txt"), "a-file.txt")
			assert.equal(db.basename("a-file.txt"), "a-file.txt")
		})
		it("should calculate directory", () => {
			assert.equal(db.basename("some/url/with/"), "with/")
			assert.equal(db.basename("/"), "/")
		})
		it("should calculate file with removed suffix", () => {
			assert.equal(db.basename("some/url/with/a-file.txt", true), "a-file")
			assert.equal(db.basename("some/url/with/a-file.txt", ".txt"), "a-file")
			assert.equal(db.basename("some/url/with/a-file.txt", ".md"), "a-file.txt")
			assert.equal(db.basename("some/url/with/a-file", true), "a-file")
			assert.equal(db.basename("some/url/with/a-file", ".txt"), "a-file")
			assert.equal(db.basename("some/url/with/.gitignore", true), "")
			assert.equal(db.basename("some/url/with/.gitignore", ".gitignore"), "")
		})
	})

	describe("dirname", () => {
		it("should calculate file path", () => {
			assert.equal(db.dirname("some/url/with/a-file.txt"), "some/url/with/")
			assert.equal(db.dirname("a-file.txt"), "/")
		})
		it("should calculate directory path", () => {
			assert.equal(db.dirname("some/url/with/"), "some/url/")
			assert.equal(db.dirname("/"), "/")
		})
	})
})
