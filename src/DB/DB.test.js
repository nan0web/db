import { suite, describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { NoConsole } from '@nan0web/log'
import BaseDB, { DocumentEntry, DocumentStat, StreamEntry } from '../index.js'
import { GetOptions, FetchOptions, DBDriverProtocol } from "./index.js"
import AuthContext from './AuthContext.js'

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
			assert.deepStrictEqual(db.options, { root: ".", cwd: "." })
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

	describe('toString', () => {
		it('should return formatted string representation', () => {
			const dbInstance = new DB({ root: '/test' })
			assert.match(dbInstance.toString(), /^DB \/test \[utf-8\]$/)
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
			const dbInstance = new DB({ predefined: new Map([['test.txt', 'content']]) })
			await dbInstance.connect()
			dbInstance.meta.set("?loaded", new DocumentStat({ mtimeMs: 1_000 }))

			const results = []
			for await (const uri of dbInstance.find('test.txt')) {
				results.push(uri)
			}

			assert.deepStrictEqual(results, ['test.txt'])
		})

		it('should load without connect', async () => {
			const db = new DB({
				predefined: [
					["test.txt", "content"]
				]
			})

			const uris = []
			for await (const uri of db.find("test.txt")) uris.push(uri)
			assert.deepEqual(uris, ["test.txt"])
		})

		it('should yield URIs matching function (loaded version)', async () => {
			const mockData = new Map([
				['file1.txt', 'content1'],
				['file2.md', 'content2'],
				['file3.txt', 'content3']
			])
			const dbInstance = new DB({ predefined: mockData })
			await dbInstance.connect()
			dbInstance.meta.set("?loaded", new DocumentStat({ mtimeMs: 1_000 }))

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
			const db = new DB()
			await db.connect()
			db.loadDocument = async () => "content"

			const result = await db.get('test.txt')
			assert.strictEqual(result, 'content')
		})

		it('should load document from a cache', async () => {
			const db = new DB({
				predefined: [
					["test.txt", "content"]
				]
			})
			await db.connect()

			const result = await db.get('test.txt')
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
			const db = new DB({ meta: new Map([['test.txt', stat]]) })

			const result = await db.stat('test.txt')
			assert.strictEqual(result.size, 100)
			assert.strictEqual(result.isFile, true)
		})

		it('should get document statistics with no cache', async () => {
			const db = new DB()
			db.statDocument = async () => new DocumentStat({ size: 100, isFile: true })

			const result = await db.stat('test.txt')
			assert.strictEqual(result.size, 100)
			assert.strictEqual(result.isFile, true)
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
		it('should call ensureAccess [w]rite and return true', async () => {
			const uri = 'doc.txt'
			const result = await db.saveDocument(uri, 'data')
			assert.strictEqual(result, true)
		})
	})

	describe('statDocument', () => {
		it('should return empty stat for not implemented function and empty meta map', async () => {
			const baseDb = new DB()
			const stat = await baseDb.statDocument('path')
			assert.ok(!stat.exists)
		})
		it("should stat document without extension", async () => {
			const db = new DB({
				predefined: [
					["index.json", {}],
				]
			})
			await db.connect()
			const stat = await db.statDocument("index")
			assert.ok(stat.exists)
		})
	})

	describe('writeDocument', () => {
		it('should call ensureAccess with w and return false', async () => {
			const uri = 'doc.txt'
			const result = await db.writeDocument(uri, 'chunk')
			assert.strictEqual(result, true)
		})
	})

	describe('dropDocument', () => {
		it.todo('should call ensureAccess with d and throws an error', async () => {
			// @todo fix the access() issue - not getting into DB.enscureAccess / driver.access()
			class AuthDriver extends DBDriverProtocol {
				async access(absoluteURI, level = "r", context = new AuthContext()) {
					if (context.hasRole("root")) {
						return true
					}
					return "r" === level
				}
				static from(input) {
					if (input instanceof AuthDriver) return input
					return new AuthDriver(input)
				}
			}
			class AuthDB extends DB {
				static Driver = AuthDriver
			}
			const db = new AuthDB({ predefined: defaultStructure, console: new NoConsole() })
			await db.connect()

			const uri = 'data.json'
			// await assert.rejects(() => db.dropDocument(uri))
			const result = await db.dropDocument(uri)
			assert.equal(result, false)
			const rights = await db.dropDocument(uri, { role: "root" })
			assert.equal(rights, true)
		})
	})

	describe('moveDocument', () => {
		it('should move document to another location', async () => {
			const db = new DB({
				predefined: [
					["from.txt", "Some information here"]
				]
			})
			await db.connect()
			assert.equal(db.data.get("from.txt"), "Some information here")
			assert.equal(db.data.get("to/another/location.txt"), undefined)
			const result = await db.moveDocument("from.txt", "to/another/location.txt")
			assert.strictEqual(result, true)
			assert.equal(db.data.get("to/another/location.txt"), "Some information here")
			assert.equal(db.data.get("from.txt"), undefined)
		})
	})

	describe('ensureAccess', () => {
		it('should return true for valid levels', async () => {
			assert.strictEqual(await db.ensureAccess('uri', 'r'), true)
			assert.strictEqual(await db.ensureAccess('uri', 'w'), true)
			assert.strictEqual(await db.ensureAccess('uri', 'd'), true)
		})

		it('should throw error for invalid level', async () => {
			const db = new BaseDB()
			await assert.rejects(() => db.ensureAccess('uri', 'x'), /Access level must be one of \[r, w, d\]/)
		})

		it("should allow access without driver (open access)", async () => {
			const db = new DB()
			await db.ensureAccess("file.txt", "r")
			await db.ensureAccess("file.txt", "w")
			await db.ensureAccess("file.txt", "d")
		})

		it("should throw on unauthorized ensureAccess", async () => {
			const db = new BaseDB()
			db.driver = {
				async access() {
					return false
				}
			}

			await assert.rejects(() => db.ensureAccess("file.txt", "r"), /Access denied/)
		})

		it("should allow access via driver", async () => {
			const db = new DB({
				driver: {
					async ensure(uri, level, context) {
						return { granted: true }
					}
				}
			})

			await db.ensureAccess("file.txt", "r")
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
				],
				console: new NoConsole()
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

		it('should not resolve the same path as we are currently processing', async () => {
			const db = new DB({
				predefined: [
					['subdir/', null],
					['subdir/file.json', '$ref:subdir/file.json#something']
				],
				console: new NoConsole()
			})
			await db.connect()

			const entries = []
			for await (const entry of db.findStream('subdir/')) {
				entries.push(entry)
			}

			// Should not cause infinite recursion
			assert.ok(entries.length > 0)
			const last = entries[entries.length - 1]
			assert.equal(last.file.path, 'subdir/file.json')
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
		})

		it('should handle missing inheritance files', async () => {
			const db = new DB({
				predefined: [
					['_', { global: 'value' }],
					["dir1/_", { a: 1 }],
					["dir1/dir2/_", { b: 2 }],
					["docs.json", { title: "docs" }]
				]
			})
			await db.connect()

			const r1 = await db.getInheritance('dir1/dir2/file')
			assert.deepEqual(r1, { global: 'value', a: 1, b: 2 })
			const r2 = await db.fetch("docs.json")
			assert.deepStrictEqual(r2, { global: "value", title: "docs" })
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
						title: "Holovna"
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

	describe('fetch', () => {
		it('should fetch merged data with all options enabled', async () => {
			const db = new DB({
				predefined: [
					['_', { global: 'value' }],
					['test.json', { value: 'test' }],
				]
			})
			await db.connect()
			const opts = new FetchOptions()
			const result = await db.fetch('test.json', opts)
			assert.deepEqual(result, { global: 'value', value: 'test' })
		})

		it('should fetch with extension processing', async () => {
			const db = new DB({
				predefined: [
					['_', { global: 'value' }],
					['parent.json', { parent: 'value' }],
					['child.json', { $ref: 'parent.json', child: 'value' }],
				]
			})
			await db.connect()
			const opts = new FetchOptions()
			const result = await db.fetch('child.json', opts)
			assert.deepEqual(result, { global: 'value', parent: 'value', child: 'value' })
		})

		it('should fetch with reference resolution', async () => {
			const db = new DB({
				predefined: [
					['_', { global: 'value' }],
					['ref.json', { prop: { subprop: 'resolved' } }],
					['data.json', { key: '$ref:ref.json#prop/subprop' }],
				]
			})
			await db.connect()
			const opts = new FetchOptions()
			const result = await db.fetch('data.json', opts)
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
			const result = await db.fetch('dir/')
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

		it("should handle circular references without infinite loop", async () => {
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
			assert.equal(result.$content.length, 2)
			assert.equal(result.nav.length, 4)
		})

		it("should not resolve to same path for inheritance", async () => {
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

	describe('fetchMerged', () => {
		it('should fetch and merge data with all options', async () => {
			const db = new DB({
				predefined: [
					['_', { global: 'value' }],
					['test.json', { value: 'test' }],
				]
			})
			await db.connect()
			const result = await db.fetch('test.json')
			assert.deepEqual(result, { global: 'value', value: 'test' })
		})

		it('should handle extension processing with inherit option', async () => {
			const db = new DB({
				predefined: [
					['_', { global: 'value' }],
					['parent.json', { parent: 'value' }],
					['child.json', { $ref: 'parent.json', child: 'value' }],
				]
			})
			await db.connect()
			const result = await db.fetch('child.json', { inherit: true })
			assert.deepEqual(result, { global: 'value', parent: 'value', child: 'value' })
		})

		it('should handle reference resolution with refs option', async () => {
			const db = new DB({
				predefined: [
					['_', { global: 'value' }],
					['ref.json', { prop: { subprop: 'resolved' } }],
					['data.json', { key: '$ref:ref.json#prop/subprop' }],
				]
			})
			await db.connect()
			const result = await db.fetch('data.json', { refs: true })
			assert.deepEqual(result, { global: 'value', key: 'resolved' })
		})

		it('should skip globals when option is false', async () => {
			const db = new DB({
				predefined: [
					['_', { global: 'value' }],
					["_/langs", ["en", "uk"]],
					['test.json', { value: 'test' }],
				]
			})
			await db.connect()
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
			const result = await db.fetch("playground/index")
			assert.ok(result)
			assert.equal(result.title, "Playground")
			assert.equal(result.theme, "light")
		})
	})

	describe('resolveReferences', () => {
		it('should resolve simple references', async () => {
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
			const db = new DB()
			db.data.set('ref.json', { prop: { subprop: 'resolved' } })
			const data = { key: '$ref:ref.json#prop/subprop' }

			const result = await db.resolveReferences(data)
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

		it('should not process self-referencing documents', async () => {
			const db = new DB({
				predefined: [
					['data.json', { key: '$ref:data.json#something' }]
				]
			})
			await db.connect()

			const data = await db.loadDocument('data.json')
			const result = await db.resolveReferences(data, 'data.json')

			// Should not cause infinite recursion and should keep the reference unresolved
			assert.deepEqual(result, { key: '$ref:data.json#something' })
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

			const result = await db.resolveReferences(data, "index.json")
			assert.deepEqual(result, { parent: 'value', child: 'value' })
		})

		it('should return data if no extension', async () => {
			const data = { key: 'value' }

			const result = await db.resolveReferences(data)
			assert.deepEqual(result, { key: 'value' })
		})

		it('should keep data including $ref if extension cannot be resolved', async () => {
			const data = { $ref: 'missing.json', key: 'value' }

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

	describe("isData", () => {
		it('should correctly determine data files', () => {
			const db = new DB()
			assert.strictEqual(db.isData('test.json'), true)
			assert.strictEqual(db.isData('test.yaml'), true)
			assert.strictEqual(db.isData('test.yml'), true)
			assert.strictEqual(db.isData('test.nano'), true)
			assert.strictEqual(db.isData('test.csv'), true)
			assert.strictEqual(db.isData('test.html'), false)
			assert.strictEqual(db.isData('test.xml'), false)
			assert.strictEqual(db.isData('test.txt'), false)
		})
	})

	describe("isRoot", () => {
		const db = new DB()
		assert.ok(db.isRoot("/"))
	})
})
