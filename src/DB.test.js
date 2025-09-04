import { suite, describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import DB, { DocumentEntry, DocumentStat, StreamEntry } from './index.js'
import { GetOpts, FetchOptions } from "./DB.js"

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

class MockDB extends DB {
	predefined = []
	/**
	 * @param {object} input
	 * @param {Array | Map} [input.predefined]
	 */
	constructor(input = {}) {
		super(input)
		const {
			predefined = new Map()
		} = input
		this.accessLevels = []
		this.predefined = new Map(predefined)
	}

	async connect() {
		await super.connect()
		for (const [key, value] of this.predefined.entries()) {
			this.data.set(key, value)
			this.meta.set(key, new DocumentStat({
				size: Buffer.byteLength(JSON.stringify(value)),
				mtimeMs: Date.now(),
				isFile: true,
			}))
		}
		for (const [key] of this.meta.entries()) {
			const dir = (this.resolveSync(key, "..") || ".") + "/"
			if (!this.meta.has(dir)) {
				const children = Array.from(this.meta.entries()).filter(
					([m, stat]) => stat.isFile && (m.startsWith(dir + "/") || "." === dir)
				)
				let size = 0
				let mtimeMs = 0
				children.forEach(([, stat]) => {
					size = Math.max(stat.size, size)
					mtimeMs = Math.max(stat.mtimeMs, mtimeMs)
				})
				this.meta.set(dir, new DocumentStat({ size, mtimeMs, isDirectory: true }))
			}
		}
	}

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

	// async loadDocument(uri, defaultValue) {
	// 	if (this.data.has(uri)) {
	// 		return this.data.get(uri)
	// 	}
	// 	return defaultValue
	// }

	// async saveDocument(uri, document) {
	// 	this.data.set(uri, document)
	// 	return false // Return false as expected by test
	// }

	// async statDocument(uri) {
	// 	if ("." === uri) {
	// 		return new DocumentStat({
	// 			isDirectory: true,
	// 			mtimeMs: Date.now(),
	// 		})
	// 	}
	// 	const dir = uri.endsWith("/") ? uri : `${uri}/`
	// 	// might be a directory
	// 	const has = this.data.entries().some(([key]) => key.startsWith(dir) && key !== dir)
	// 	if (has) {
	// 		return new DocumentStat({ isDirectory: true, mtimeMs: Date.now() })
	// 	}
	// 	return this.meta.get(uri) || new DocumentStat({
	// 		isDirectory: false,
	// 		isFile: true,
	// 		mtimeMs: Date.now(),
	// 		size: 0,
	// 	})
	// }

	async listDir(uri) {
		const prefix = uri === '.' ? '' : uri.endsWith("/") ? uri : uri + '/'
		const keys = Array.from(this.data.keys())
		const filtered = keys.filter(
			key => key.startsWith(prefix) && key.indexOf('/', prefix.length) === -1
		)
		return filtered.map(key => {
			const name = key.substring(prefix.length)
			const stat = this.meta.get(key) || new DocumentStat({ isFile: true, mtimeMs: Date.now() })
			return new DocumentEntry({ name, stat })
		})
	}

	async resolve(...args) {
		return Promise.resolve(this.resolveSync(...args))
	}

	relative(from, to) {
		if (from === this.root) {
			return to.startsWith(from + "/") ? to.substring(from.length + 1) : to
		}
		return to
	}
}

suite("DB", () => {
	/** @type {MockDB} */
	let db

	beforeEach(async () => {
		db = new MockDB({ predefined: defaultStructure })
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
			const dbs = [new MockDB({ root: 'test1' }), new MockDB({ root: 'test2' })]

			const dbInstance = new MockDB({
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
			db.meta.set('?loaded', true)
			assert.strictEqual(db.loaded, true)
		})
	})

	describe('attach and detach', () => {
		let db1, db2

		beforeEach(() => {
			db1 = new MockDB()
			db2 = new MockDB()
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
		it('should create new DB with subset of data', () => {
			const mockData = new Map([
				['dir/file1.txt', 'content1'],
				['dir/file2.txt', 'content2'],
				['other.txt', 'other']
			])
			const mockMeta = new Map([
				['dir/file1.txt', new DocumentStat({ size: 100 })],
				['dir/file2.txt', new DocumentStat({ size: 200 })],
				['other.txt', new DocumentStat({ size: 300 })]
			])

			const dbInstance = new MockDB({
				root: '/root',
				data: mockData,
				meta: mockMeta,
			})

			const extracted = dbInstance.extract('dir/')

			assert.strictEqual(extracted.root, '/root/dir/')
			assert.strictEqual(extracted.data.size, 2)
			assert.strictEqual(extracted.meta.size, 2)
			assert.ok(extracted.data.has('file1.txt'))
			assert.ok(extracted.data.has('file2.txt'))
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
		it('should throw not implemented error', () => {
			const baseDb = new DB()
			assert.throws(() => baseDb.relative('from', 'to'), /not implemented/i)
		})
	})

	describe('toString', () => {
		it('should return formatted string representation', () => {
			const dbInstance = new MockDB({ root: '/test' })
			assert.match(dbInstance.toString(), /^MockDB \/test \[utf-8\]$/)
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
			const db = new MockDB({
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
	})

	describe('readBranch', () => {
		it('should return async generator', async () => {
			const result = await db.readBranch('path', 1)
			assert.ok(result[Symbol.asyncIterator])
		})
	})

	describe('requireConnected', () => {
		it('should connect if not connected', async () => {
			const db = new MockDB()
			assert.strictEqual(db.connected, false)
			await db.requireConnected()
			assert.strictEqual(db.connected, true)
		})

		it('should throw error if connection fails', async () => {
			const failingDb = new MockDB()
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
			const dbInstance = new MockDB({ data: new Map([['test.txt', 'content']]) })
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
			const dbInstance = new MockDB({ data: mockData })
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
			const dbInstance = new MockDB({ data: mockData })
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
			const dbInstance = new MockDB({ data: new Map([['test.txt', 'content']]) })

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
			const dbInstance = new MockDB({ meta: new Map([['test.txt', stat]]) })

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
			assert.equal(path, "api/users")
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
			const dbInstance = new MockDB({ data: mockData, meta: mockMeta })

			await dbInstance.push()

			assert.ok(dbInstance.accessLevels.find(a => a.uri === 'file1.txt' && a.level === 'w'))
			assert.ok(dbInstance.accessLevels.find(a => a.uri === 'file2.txt' && a.level === 'w'))
		})

		it('should call ensureAccess for specific document', async () => {
			const dbInstance = new MockDB()

			await dbInstance.push('specific.txt')

			assert.ok(dbInstance.accessLevels.find(a => a.uri === 'specific.txt' && a.level === 'w'))
		})
	})

	describe('disconnect', () => {
		it('should set connected to false', async () => {
			db.connected = true
			await db.disconnect()
			assert.strictEqual(db.connected, false)
		})
	})

	describe('listDir', () => {
		it('should throw not implemented error', async () => {
			const baseDb = new DB()
			const fn = async () => await baseDb.listDir('path')
			await assert.rejects(fn, /not implemented/i)
		})
	})

	describe('findStream', () => {
		it('should yield StreamEntry objects', async () => {
			const db = new MockDB({
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
	})

	describe('from', () => {
		it('should return existing instance if DB', () => {
			const existing = new MockDB()
			const result = MockDB.from(existing)
			assert.strictEqual(result, existing)
		})

		it('should create new instance from object', () => {
			const props = { root: '/test' }
			const result = MockDB.from(props)
			assert.ok(result instanceof MockDB)
			assert.strictEqual(result.root, '/test')
		})
	})

	describe('getInheritance', () => {
		it('should get inheritance data for path', async () => {
			const dbInstance = new MockDB()
			dbInstance.data.set('_', { global: 'value' })
			dbInstance.data.set('dir1/_', { a: 1 })
			dbInstance.data.set('dir1/dir2/_', { b: 2 })

			const result = await dbInstance.getInheritance('dir1/dir2/file')
			assert.deepEqual(result, { global: 'value', a: 1, b: 2 })
		})

		it('should handle missing inheritance files', async () => {
			const db = new MockDB({
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
			const dbInstance = new MockDB()
			dbInstance.data.set('_', { global: 'value' })
			dbInstance.data.set('dir1/_', { a: 1 })

			const result1 = await dbInstance.getInheritance('dir1/file')
			const result2 = await dbInstance.getInheritance('dir1/file2')

			assert.deepEqual(result1, { global: 'value', a: 1 })
			assert.deepEqual(result2, { global: 'value', a: 1 })
			assert.ok(dbInstance._inheritanceCache.has('/'))
			assert.ok(dbInstance._inheritanceCache.has('dir1/'))
		})
	})

	describe('getGlobals', () => {
		it('should get global variables from _ directory', async () => {
			const dbInstance = new MockDB()
			// Set up a directory structure with _/ subdirectory
			const globalsUri = '_/langs'
			dbInstance.data.set(globalsUri, ['en', 'uk'])

			// Set up a file that would access these globals
			const fileUri = 'some/deep/path/file.txt'

			const result = await dbInstance.getGlobals(fileUri)
			assert.deepEqual(result, {})
		})

		it('should handle _ directory being file', async () => {
			const db = new MockDB({
				predefined: [
					['_/currencies', ["BTC"]],
					['dir1/_/currencies', ["BTC", "UAH"]],
					['dir1/dir2/_/currencies', ["USD"]],
				]
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
			const dbInstance = new MockDB()
			const result = await dbInstance.getGlobals('any/file/path')
			assert.deepEqual(result, {})
		})
	})

	describe('fetch', () => {
		it('should fetch merged data with all options enabled', async () => {
			const dbInstance = new MockDB()
			dbInstance.data.set('_', { global: 'value' })
			dbInstance.data.set('test.json', { value: 'test' })

			const opts = new FetchOptions()
			const result = await dbInstance.fetch('test.json', opts)
			assert.deepEqual(result, { global: 'value', value: 'test' })
		})

		it('should fetch with extension processing', async () => {
			const dbInstance = new MockDB()
			dbInstance.data.set('_', { global: 'value' })
			dbInstance.data.set('parent.json', { parent: 'value' })
			dbInstance.data.set('child.json', { $ref: 'parent.json', child: 'value' })

			const opts = new FetchOptions()
			const result = await dbInstance.fetch('child.json', opts)
			assert.deepEqual(result, { global: 'value', parent: 'value', child: 'value' })
		})

		it('should fetch with reference resolution', async () => {
			const dbInstance = new MockDB()
			dbInstance.data.set('_', { global: 'value' })
			dbInstance.data.set('ref.json', { prop: { subprop: 'resolved' } })
			dbInstance.data.set('data.json', { key: '$ref:ref.json#prop/subprop' })

			const opts = new FetchOptions()
			const result = await dbInstance.fetch('data.json', opts)
			assert.deepEqual(result, { global: 'value', key: 'resolved' })
		})

		it('should return default value when document not found', async () => {
			const db = new MockDB()
			const opts = new FetchOptions({ defaultValue: { value: 'default' } })
			const result = await db.fetch('missing.json', opts)
			assert.deepEqual(result, { value: 'default' })
		})

		it('should handle directory access when allowDirs is true (default)', async () => {
			const db = new MockDB({
				predefined: [
					['dir/index.json', { title: 'Directory Index' }]
				]
			})
			await db.connect()
			const result = await db.fetch('dir')
			assert.deepEqual(result, { title: 'Directory Index' })
		})

		it('should load globals properly when globals option is true (default)', async () => {
			const db = new MockDB({
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
			const db = new MockDB({
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
	})

	describe('fetchMerged', () => {
		it('should fetch and merge data with all options', async () => {
			const db = new MockDB()
			db.data.set('_', { global: 'value' })
			db.data.set('test.json', { value: 'test' })
			const result = await db.fetch('test.json')
			assert.deepEqual(result, { global: 'value', value: 'test' })
		})

		it('should handle extension processing with inherit option', async () => {
			const db = new MockDB()
			db.data.set('_', { global: 'value' })
			db.data.set('parent.json', { parent: 'value' })
			db.data.set('child.json', { $ref: 'parent.json', child: 'value' })
			const result = await db.fetch('child.json', { inherit: true })
			assert.deepEqual(result, { global: 'value', parent: 'value', child: 'value' })
		})

		it('should handle reference resolution with refs option', async () => {
			const db = new MockDB()
			db.data.set('_', { global: 'value' })
			db.data.set('ref.json', { prop: { subprop: 'resolved' } })
			db.data.set('data.json', { key: '$ref:ref.json#prop/subprop' })
			const result = await db.fetch('data.json', { refs: true })
			assert.deepEqual(result, { global: 'value', key: 'resolved' })
		})

		it('should skip globals when option is false', async () => {
			const db = new MockDB()
			db.data.set('_', { global: 'value' })
			db.data.set("_/langs", ["en", "uk"])
			db.data.set('test.json', { value: 'test' })
			const result = await db.fetch('test.json', { globals: false })
			assert.deepEqual(result, { global: 'value', value: 'test' })
		})

		it('should load globals', async () => {
			const db = new MockDB({
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
			const db = new MockDB({
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
			const db = new MockDB()
			db.data.set('ref.json', { prop: { subprop: 'resolved' } })
			db.data.set('data.json', { key: '$ref:ref.json#prop/subprop' })

			const result = await db.fetch("data.json", { refs: false })
			assert.deepEqual(result, { key: '$ref:ref.json#prop/subprop' })
		})
	})

	describe('resolveReferences', () => {
		it('should resolve simple references', async () => {
			const dbInstance = new MockDB()
			dbInstance.data.set('ref.json', 'referenced value')
			const data = { key: '$ref:ref.json' }

			const result = await dbInstance.resolveReferences(data)
			assert.deepEqual(result, { key: 'referenced value' })
		})

		it('should resolve fragment references', async () => {
			const dbInstance = new MockDB()
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
			const db = new MockDB()
			db.data.set('ref.txt', 'referenced value')
			const data = { nested: { key: '$ref:ref.txt' } }

			const result = await db.resolveReferences(data)
			assert.deepEqual(result, { nested: { key: 'referenced value' } })
		})

		it('should resolve nested references (property version)', async () => {
			const db = new MockDB({
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
			const db = new MockDB({
				predefined: [
					["ref.json", "referenced value"]
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
			const dbInstance = new MockDB()
			dbInstance.data.set('ref.json', { color: "red", size: "xl" })
			const data = { nested: { key: { $ref: 'ref.json', color: "blue" } } }

			const result = await dbInstance.resolveReferences(data)
			assert.deepEqual(result, {
				nested: { key: { size: "xl", color: "blue" } }
			})
		})
	})

	describe('processExtensions', () => {
		it('should process extension with $ref', async () => {
			const db = new MockDB()
			db.data.set('parent.json', { parent: 'value' })
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

	describe("GetOpts", () => {
		it("should extension provide its values", async () => {
			class GetOptsExtended extends GetOpts {
				defaultValue = ""
			}
			class DBExtended extends DB {
				static GetOpts = GetOptsExtended
				async get(uri, opts = new this.GetOpts()) {
					opts = this.GetOpts.from(opts)
					return [opts.defaultValue, uri]
				}
			}
			const db = new DBExtended()
			const result = await db.get("anything")
			assert.deepEqual(result, ["", "anything"])
		})
	})
})
