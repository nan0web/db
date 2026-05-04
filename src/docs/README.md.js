import { describe, it, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import { NoConsole } from '@nan0web/log'
import { DocsParser, DatasetParser } from '@nan0web/test'
import { DBFS } from '@nan0web/db-fs'

import DBDefault, {
	DB,
	Data,
	AuthContext,
	DBDriverProtocol,
	GetOptions,
	FetchOptions,
	Directory,
	DirectoryIndex,
	DocumentEntry,
	DocumentStat,
	StreamEntry,
	DBConfig,
	RevisionInfo,
} from '../index.js'
import {
	normalize,
	basename,
	dirname,
	extname,
	resolveSync,
	relative,
	absolute,
	isRemote,
	isAbsolute,
} from '../DB/path.js'

const fs = new DBFS()
let pkg

before(async () => {
	pkg = await fs.loadDocument('package.json')
})

let console = new NoConsole()

beforeEach(() => {
	console = new NoConsole()
})

function testRender() {
	/**
	 * @docs
	 * # @nan0web/db
	 *
	 * <!-- %PACKAGE_STATUS% -->
	 *
	 * Agnostic document database and data manipulation utilities. Designed to be
	 * flexible, minimal and powerful — the tool that supports any data format and
	 * nested hierarchy with reference resolution, inheritance and global variables.
	 *
	 * Inspired by `zero-is-not-a-number` rule of nan0web:
	 * > Every data becomes a database.
	 *
	 * Based on real use-cases, supports:
	 * - **VFS Routing** — `mount()` composes multiple storage backends into one tree. Supports **Root Mount** (`prefix: ''`) for transparent catchment of all relative paths.
	 * - **Fallback Chain** — `attach()` provides failover with transparent notifications
	 * - **Model Hydration** — automatic transformation of plain objects into typed models
	 * - officially registered **.nan0** as a native data extension
	 * - object flattening/unflattening (with literal slash preservation)
	 * - deep merging with reference handling
	 * - async directory listing (for fs & fetch layers)
	 * - stream-based progress during traversal
	 *
	 * See how it works in [playground](#playground).
	 *
	 * ## Architecture
	 *
	 * `DB` is a VFS Router. Mount different storage backends, attach fallbacks, hydrate models:
	 *
	 * ```
	 * [App] → db.fetch('/media/logo.png')  → [S3 Driver]
	 *         db.fetch('/cache/user_1')    → [Redis Driver]
	 *         db.fetch('/play/demo-app')   → [FS Driver] → Document instance
	 * ```
	 *
	 * ## Installation
	 */
	it('How to install with npm?', () => {
		/**
		 * ```bash
		 * npm install @nan0web/db
		 * ```
		 */
		assert.equal(pkg.name, '@nan0web/db')
		assert.deepStrictEqual(DBDefault, DB)
		assert.ok(DB instanceof Function)
		assert.ok(Data instanceof Function)
		assert.ok(AuthContext instanceof Function)
		assert.ok(DBDriverProtocol instanceof Function)
		assert.ok(GetOptions instanceof Function)
		assert.ok(FetchOptions instanceof Function)
		assert.ok(Directory instanceof Function)
		assert.ok(DirectoryIndex instanceof Function)
		assert.ok(DocumentEntry instanceof Function)
		assert.ok(DocumentStat instanceof Function)
		assert.ok(StreamEntry instanceof Function)
		assert.ok(DBConfig instanceof Function)
		assert.ok(RevisionInfo instanceof Function)
	})
	/**
	 * @docs
	 */
	it('How to install with pnpm?', () => {
		/**
		 * ```bash
		 * pnpm add @nan0web/db
		 * ```
		 */
		assert.equal(pkg.name, '@nan0web/db')
	})
	/**
	 * @docs
	 */
	it('How to install with yarn?', () => {
		/**
		 * ```bash
		 * yarn add @nan0web/db
		 * ```
		 */
		assert.equal(pkg.name, '@nan0web/db')
	})

	/**
	 * @docs
	 * ## Quick Start
	 * ### Example: Root Mount Support
	 *
	 * You can mount a database at an empty prefix (`''`). This instance will catch
	 * all relative paths that don't match more specific mount points. Extremely
	 * useful for isolated playground environments.
	 */
	it('How to mount a database as virtual root?', () => {
		//import DB from "@nan0web/db"
		const rootDB = new DB()
		const targetDB = new DB({ data: new Map([['doc.json', { ok: true }]]) })
		rootDB.mount('', targetDB)

		// Accessing relative path transparently routes to targetDB
		assert.ok(rootDB._findMount('doc.json'))
		assert.strictEqual(rootDB._findMount('doc.json').db, targetDB)
	})

	/**
	 * @docs
	 * ### Native `.nan0` Data Extension
	 *
	 * Since `v1.4.4`, `.nan0` is a first-class citizen alongside `.json`. It is
	 * automatically recognized as a data-containing file.
	 */
	it('How to use native .nan0 data extension?', async () => {
		//import DB from "@nan0web/db"
		const db = new DB({ data: new Map([['vault.nan0', { secret: 42 }]]) })
		const result = await db.get('vault.nan0')
		console.info(result) // ← { secret: 42 }
		assert.deepStrictEqual(console.output()[0][1], { secret: 42 })
	})

	/**
	 * @docs
	 * ## JSON & Data
	 */
	it('How to load Data document?', async () => {
		//import DB from "@nan0web/db"
		const db = new DB()
		const doc = await db.loadDocumentAs('.json', 'doc', { key: 'value' })
		console.info(doc) // ← { key: "value" }
		assert.deepStrictEqual(console.output()[0][1], { key: 'value' })
	})

	/**
	 * @docs
	 * ### Stream line-by-line reading
	 *
	 * `.jsonl`, `.csv`, and `.csv0` formats safely stream line-by-line handling
	 * chunk fragmentation natively via the standard Driver Protocol.
	 */
	it('How to stream lines from data files?', async () => {
		// Example driver implementation
		class MockDriver extends DBDriverProtocol {
			async stream(uri) {
				return (async function* () {
					yield '{"uid":1}'
					yield '{"uid":2}'
					yield '{"uid":3}'
				})()
			}
		}

		// Attach your custom or imported driver
		const db = new DB({ driver: new MockDriver() })

		const stream = await db.stream('demo.jsonl')
		const lines = []
		for await (const line of stream) {
			lines.push(line)
		}

		console.info(lines.length) // ← 3
		console.info(lines) // ← [ '{"uid":1}', '{"uid":2}', '{"uid":3}' ]
		assert.equal(console.output()[0][1], 3)
		assert.deepStrictEqual(console.output()[1][1], ['{"uid":1}', '{"uid":2}', '{"uid":3}'])
	})

	/**
	 * @docs
	 * ### Example: Using `get()` with default fallback
	 */
	it('How to get or return default?', async () => {
		//import DB from "@nan0web/db"
		const db = new DB()
		const result = await db.get('missing-file.json', { defaultValue: {} })
		console.info(result) // ← {}
		assert.deepStrictEqual(console.output()[0][1], {})
	})

	/**
	 * @docs
	 * ### Example: Loading known document
	 */
	it('How to get specific document?', async () => {
		//import DB from "@nan0web/db"
		const db = new DB({ data: new Map([['file.txt', 'text']]) })
		const result = await db.get('file.txt')
		console.info(result) // ← "text"
		assert.equal(console.output()[0][1], 'text')
	})

	/**
	 * @docs
	 * ## Usage with Real Context
	 *
	 * ### Resolving references and global vars
	 */
	it('How to use document reference system?', async () => {
		//import DB from "@nan0web/db"
		const db = new DB({
			data: new Map([
				['_/index.json', { global: 'value' }],
				['data.json', { $ref: '_/index.json', key: 'val' }],
			]),
		})
		await db.connect()
		const res = await db.fetch('data.json')
		console.info(res) // ← { global: "value", key: "val" }
		assert.deepStrictEqual(console.output()[0][1], { global: 'value', key: 'val' })
	})

	/**
	 * @docs
	 * ## Playground
	 */
	it('CLI sandbox for safe experiments:', () => {
		/**
		 * ```bash
		 * git clone https://github.com/nan0web/db.git
		 * cd db
		 * npm install
		 * npm run play
		 * ```
		 */
		assert.ok(String(pkg.scripts?.play).includes('node play'))
	})

	/**
	 * @docs
	 * ## API Reference
	 *
	 * The heart of the package includes core tools to manage hierarchical data structures.
	 *
	 * ### `db.get(uri, GetOpts)`
	 * Loads/returns document content from its URI.
	 *
	 * * **Parameters**
	 *   * `uri` *(string)* – Document URI.
	 *   * `GetOpts.defaultValue` *(any)* – fallback if doc not found
	 *
	 * * **Returns**
	 *   * *(any)* – Document content or default value.
	 */
	it('How to get document value?', async () => {
		//import DB from "@nan0web/db"
		const db = new DB({ data: new Map([['x.file', 'hello']]) })
		const result = await db.get('x.file')
		console.info(result) // ← "hello"
		assert.equal(console.output()[0][1], 'hello')
	})

	/**
	 * @docs
	 * ### `db.fetch(uri, FetchOptions)`
	 * Like get, plus advanced features: refs, vars, inherit rules processing.
	 *
	 * Supports extension lookup, e.g. find `.json` even when omitted.
	 */
	it('How to load extended data?', async () => {
		//import DB from "@nan0web/db"
		const db = new DB({ predefined: [['file.json', { value: 'loaded' }]] })
		await db.connect()
		const result = await db.fetch('file')
		console.info(result) // ← { value: "loaded" }
		assert.deepStrictEqual(console.output()[0][1], { value: 'loaded' })
	})

	/**
	 * @docs
	 * ### `db.set(uri, data)`
	 * Sets document content and marks metadata updates.
	 */
	it('How to save new content?', async () => {
		//import DB from "@nan0web/db"
		const db = new DB()
		const res = await db.set('file.text', 'save me!')
		console.info(res) // ← "save me!"
		console.info(db.data.get('file.text')) // ← "save me!"
		assert.equal(console.output()[0][1], 'save me!')
		assert.equal(console.output()[1][1], 'save me!')
	})

	/**
	 * @docs
	 * ### `Data.flatten(data)`
	 * Flattens nested object into paths as keys.
	 */
	it('How to flatten object?', () => {
		//import { Data } from "@nan0web/db"
		const flat = Data.flatten({ x: { a: [1, 2, { b: 3 }] } })
		console.info(flat) // ← { 'x/a/[0]': 1, 'x/a/[1]': 2, 'x/a/[2]/b': 3 }
		assert.deepStrictEqual(console.output()[0][1], {
			'x/a/[0]': 1,
			'x/a/[1]': 2,
			'x/a/[2]/b': 3,
		})
	})

	/**
	 * @docs
	 * ### `Data.unflatten(data)`
	 * Reconstructs nested structure from flat keys.
	 */
	it('How to unflatten data?', () => {
		//import { Data } from "@nan0web/db"
		const nested = Data.unflatten({
			'x/y/z': 7,
			'arr/[0]/title': 'first',
			'arr/[1]/title': 'second',
		})
		console.info(nested) // ← { x: { y: { z: 7 } }, arr: [ { title: 'first' }, { title: 'second' } ] }
		assert.deepStrictEqual(console.output()[0][1], {
			x: { y: { z: 7 } },
			arr: [{ title: 'first' }, { title: 'second' }],
		})
	})

	/**
	 * @docs
	 * ### Literal Slash Preservation
	 *
	 * Since `v1.4.2`, keys containing the `OBJECT_DIVIDER` (default `/`) are automatically
	 * escaped during flattening and restored during unflattening. This ensures that
	 * i18n keys like `"Manage / Update"` are not incorrectly split into nested objects.
	 */
	it('How to preserve literal slashes in keys?', () => {
		//import { Data } from "@nan0web/db"
		const obj = { 'Manage / Update': 'Керування' }
		const flat = Data.flatten(obj)

		// The slash is escaped to Unicode FRACTION SLASH '∕'
		console.info(Object.keys(flat)[0]) // ← "Manage ∕ Update"

		const unflat = Data.unflatten(flat)
		console.info(unflat['Manage / Update']) // ← "Керування"

		assert.equal(console.output()[0][1], 'Manage \u2215 Update')
		assert.equal(console.output()[1][1], 'Керування')
		assert.deepStrictEqual(unflat, obj)
	})

	/**
	 * @docs
	 * ### `Data.merge(a, b)`
	 * Deep merges two objects, handling array conflicts by replacing.
	 */
	it('How to merge deeply?', () => {
		//import { Data } from "@nan0web/db"
		const a = { x: { one: 1 }, arr: [0] }
		const b = { y: 'two', x: { two: 2 }, arr: [1] }
		const merged = Data.merge(a, b)
		console.info(merged) // ← { x: { one: 1, two: 2 }, y: 'two', arr: [ 1 ] }
		assert.deepStrictEqual(console.output()[0][1], {
			x: { one: 1, two: 2 },
			y: 'two',
			arr: [1],
		})
	})

	/**
	 * @docs
	 * ### `Data.find(path, data)`
	 *
	 * Finds value by string path or array path. Use array path to access keys containing `/`.
	 */
	it('How to find value by path?', () => {
		//import { Data } from "@nan0web/db"
		const data = { 'I/O': 'value', nested: { item: 1 } }
		console.info(Data.find('nested/item', data)) // ← 1
		console.info(Data.find(['I/O'], data)) // ← "value"
		assert.equal(console.output()[0][1], 1)
		assert.equal(console.output()[1][1], 'value')
	})

	/**
	 * @docs
	 * ## Path Utilities
	 *
	 * `@nan0web/db/path` provides URI/path resolution functions for cross-platform use.
	 * Supports normalization, basename/dirname extraction, and absolute/relative resolution.
	 *
	 * ### Import Path Utilities
	 */
	it('How to import path utilities?', () => {
		//import { normalize, basename, dirname, absolute, resolveSync } from '@nan0web/db/path'
		console.info(normalize('a/b/../c')) // ← a/c
		console.info(basename('path/to/file.txt')) // ← file.txt
		console.info(dirname('path/to/file.txt')) // ← path/to/
		console.info(absolute('/base', 'root', 'file')) // ← /base/root/file
		console.info(resolveSync('/base', '.', 'file.txt')) // ← file.txt
		assert.equal(console.output()[0][1], 'a/c')
		assert.equal(console.output()[1][1], 'file.txt')
		assert.equal(console.output()[2][1], 'path/to/')
		assert.equal(console.output()[3][1], '/base/root/file')
		assert.equal(console.output()[4][1], 'file.txt')
	})

	/**
	 * @docs
	 * ### `normalize(...segments)`
	 * Normalizes path segments, handling `../`, `./`, and duplicate slashes.
	 */
	it('How to normalize path segments?', () => {
		//import { normalize } from '@nan0web/db/path'
		console.info(normalize('a/b/../c')) // ← a/c
		console.info(normalize('a//b///c')) // ← a/b/c
		console.info(normalize('dir/sub/')) // ← dir/sub/
		assert.equal(console.output()[0][1], 'a/c')
		assert.equal(console.output()[1][1], 'a/b/c')
		assert.equal(console.output()[2][1], 'dir/sub/')
	})

	/**
	 * @docs
	 * ### `basename(uri, [suffix])`
	 * Extracts basename, optionally removing suffix or extension.
	 */
	it('How to extract basename?', () => {
		//import { basename } from '@nan0web/db/path'
		console.info(basename('/dir/file.txt')) // ← file.txt
		console.info(basename('/dir/file.txt', '.txt')) // ← file
		console.info(basename('/dir/file.txt', true)) // ← file (remove ext)
		console.info(basename('/dir/')) // ← dir/
		assert.equal(console.output()[0][1], 'file.txt')
		assert.equal(console.output()[1][1], 'file')
		assert.equal(console.output()[2][1], 'file')
		assert.equal(console.output()[3][1], 'dir/')
	})

	/**
	 * @docs
	 * ### `dirname(uri)`
	 * Extracts parent directory path.
	 */
	it('How to extract dirname?', () => {
		//import { dirname } from '@nan0web/db/path'
		console.info(dirname('/a/b/file')) // ← /a/b/
		console.info(dirname('/a/b/')) // ← /a/
		console.info(dirname('/file')) // ← /
		console.info(dirname('file.txt')) // ← .
		assert.equal(console.output()[0][1], '/a/b/')
		assert.equal(console.output()[1][1], '/a/')
		assert.equal(console.output()[2][1], '/')
		assert.equal(console.output()[3][1], '.')
	})

	/**
	 * @docs
	 * ### `extname(uri)`
	 * Extracts file extension with dot (lowercase). Since `v1.5.3`, correctly ignores
	 * dots in directory names of absolute paths.
	 */
	it('How to extract extension?', () => {
		//import { extname } from '@nan0web/db/path'
		console.info(extname('file.TXT')) // ← .txt
		console.info(extname('/Users/user/src/nan.web/apps/t.json')) // ← .json
		console.info(extname('.gitignore')) // ← ''
		console.info(extname('/dir/')) // ← ''
		assert.equal(console.output()[0][1], '.txt')
		assert.equal(console.output()[1][1], '.json')
		assert.equal(console.output()[2][1], '')
		assert.equal(console.output()[3][1], '')
	})

	/**
	 * @docs
	 * ### `resolveSync(cwd, root, ...segments)`
	 * Resolves segments relative to cwd/root (synchronous).
	 */
	it('How to resolve path synchronously?', () => {
		//import { resolveSync } from '@nan0web/db/path'
		console.info(resolveSync('/base', '.', 'a/b/../c')) // ← a/c
		assert.equal(console.output()[0][1], 'a/c')
	})

	/**
	 * @docs
	 * ### `relative(from, to)`
	 * Computes relative path from `from` to `to`.
	 */
	it('How to compute relative path?', () => {
		//import { relative } from '@nan0web/db/path'
		console.info(relative('/a/b', '/a/c')) // ← c
		console.info(relative('/root/dir', '/root/')) // ← dir
		assert.equal(console.output()[0][1], 'c')
		assert.equal(console.output()[1][1], 'dir')
	})

	/**
	 * @docs
	 * ### `absolute(cwd, root, ...segments)`
	 * Builds absolute path/URL from cwd, root, and segments.
	 */
	it('How to build absolute path?', () => {
		//import { absolute } from '@nan0web/db/path'
		console.info(absolute('/base', 'root', 'file')) // ← /base/root/file
		console.info(absolute('https://ex.com', 'api', 'v1')) // ← https://ex.com/api/v1
		assert.equal(console.output()[0][1], '/base/root/file')
		assert.equal(console.output()[1][1], 'https://ex.com/api/v1')
	})

	/**
	 * @docs
	 * ### `isRemote(uri)` & `isAbsolute(uri)`
	 * Checks if URI is remote or absolute.
	 */
	it('How to check URI type?', () => {
		//import { isRemote, isAbsolute } from '@nan0web/db/path'
		console.info(isRemote('https://ex.com')) // ← true
		console.info(isAbsolute('/abs/path')) // ← true
		console.info(isAbsolute('./rel')) // ← false
		assert.equal(console.output()[0][1], true)
		assert.equal(console.output()[1][1], true)
		assert.equal(console.output()[2][1], false)
	})

	/**
	 * @docs
	 * ## Java•Script types & Autocomplete
	 * Package is fully typed with jsdoc and d.ts.
	 */
	it('How many d.ts files should cover the source?', () => {
		assert.equal(pkg.types, './types/index.d.ts')
	})

	/**
	 * @docs
	 * ## Drivers & Extensions
	 *
	 * Drivers extend DB with storage backends. Extend `DBDriverProtocol` for custom logic.
	 *
	 * ### Basic Driver Extension
	 */
	it('How to extend DBDriverProtocol?', async () => {
		//import { DBDriverProtocol } from '@nan0web/db'
		class MyDriver extends DBDriverProtocol {
			async read(uri) {
				// Custom read logic
				return { data: 'from custom storage' }
			}
		}
		const driver = new MyDriver()
		console.log(await driver.read('/path')) // ← { data: 'from custom storage' }
		assert.deepStrictEqual(console.output()[0][1], { data: 'from custom storage' })
	})

	/**
	 * @docs
	 * ### Using Driver in DB
	 */
	it('How to attach driver to DB?', async () => {
		//import { DB, DBDriverProtocol } from '@nan0web/db'
		class SimpleDriver extends DBDriverProtocol {
			async read(uri) {
				return `Read: ${uri}`
			}
			async write(uri, data) {
				return true
			}
		}
		class ExtendedDB extends DB {
			constructor() {
				super({ driver: new SimpleDriver() })
				this.loadDocument = async (uri) => await this.driver.read(uri)
				this.saveDocument = async (uri, data) => await this.driver.write(uri, data)
			}
		}
		const db = new ExtendedDB()
		await db.connect()
		console.info(await db.get('/test')) // ← Read: test
		assert.equal(console.output()[0][1], 'Read: test')
	})

	/**
	 * @docs
	 * ## Authentication & Authorization
	 *
	 * Use `AuthContext` for role-based access in DB operations.
	 *
	 * ### Basic AuthContext Usage
	 */
	it('How to create AuthContext?', () => {
		//import { AuthContext } from '@nan0web/db'
		const ctx = new AuthContext({ role: 'user', roles: ['user', 'guest'] })
		console.info(ctx.hasRole('user')) // ← true
		console.info(ctx.role) // ← user
		assert.equal(console.output()[0][1], true)
		assert.equal(console.output()[1][1], 'user')
	})

	/**
	 * @docs
	 * ### AuthContext with DB Access
	 */
	it('How to use AuthContext in DB?', async () => {
		//import { DB, AuthContext } from '@nan0web/db'
		const db = new DB()
		const ctx = new AuthContext({ role: 'admin' })
		await db.set('secure/file.txt', 'secret', ctx)
		console.info(await db.get('secure/file.txt', {}, ctx)) // ← secret
		assert.equal(console.output()[0][1], 'secret')
	})

	/**
	 * @docs
	 * ### Handling Access Failures
	 */
	it('How to handle auth failures?', () => {
		//import { AuthContext } from '@nan0web/db'
		const ctx = new AuthContext()
		ctx.fail(new Error('Access denied'))
		console.info(ctx.fails) // ← [Error: Access denied]
		console.info(ctx.hasRole('admin')) // ← false
		assert.deepStrictEqual(console.output()[0][1], [new Error('Access denied')])
		assert.equal(console.output()[1][1], false)
	})

	/**
	 * @docs
	 * ## VFS Security
	 *
	 * After mounting all databases, `seal()` locks the mount registry.
	 * Any further `mount()` or `unmount()` calls will throw an error.
	 * This prevents untrusted plugins from hijacking mount points at runtime.
	 *
	 * ### Sealing the mount registry
	 */
	it('How to seal mount registry?', () => {
		//import DB from '@nan0web/db'
		const db = new DB()
		const cache = new DB()
		db.mount('cache', cache)
		db.seal()
		console.info(db.sealed) // ← true
		assert.strictEqual(db.sealed, true)
		assert.throws(() => db.mount('evil', new DB()), {
			message: /Mount registry is sealed/,
		})
	})

	/**
	 * @docs
	 * ### Reserved prefix error contract
	 *
	 * URIs starting with `~` or `@` are reserved for mount points.
	 * If accessed before mounting, DB throws a clear error with a hint:
	 */
	it('How does DB handle unmounted reserved prefixes?', () => {
		//import DB from '@nan0web/db'
		const db = new DB()
		assert.throws(() => db._findMount('~/zones'), {
			message: /Mount point "~" not found.*Did you forget to call db\.mount/,
		})
		// Regular paths return null (normal fallback behavior)
		assert.strictEqual(db._findMount('some/path'), null)
	})

	/**
	 * @docs
	 * ## Domain Models
	 *
	 * `DBConfig` and `RevisionInfo` provide standard data definitions.
	 *
	 * ### `DBConfig`
	 */
	it('How to securely serialize connection arguments?', () => {
		//import { DBConfig } from '@nan0web/db'
		const config = new DBConfig('redis://yaro:pass123@redis.local:6379/cache')
		console.info(config.protocol) // ← redis
		console.info(config.safeDsn) // ← redis://yaro:***@redis.local:6379/cache
		assert.equal(console.output()[0][1], 'redis')
		assert.equal(console.output()[1][1], 'redis://yaro:***@redis.local:6379/cache')
	})

	/**
	 * @docs
	 * ### `RevisionInfo`
	 */
	it('How to standardize document history?', () => {
		//import { RevisionInfo } from '@nan0web/db'
		const ts = new Date('2026-04-06T00:00:00Z').toISOString()
		const rev = new RevisionInfo({ sha: '1234567890abcdef', timestamp: ts })
		console.info(rev.shortSha) // ← 1234567
		assert.equal(console.output()[0][1], '1234567')
	})

	/**
	 * @docs
	 * ### `Directory.isConfig(path)`
	 *
	 * Checks if a path represents a directory configuration file (`_.yaml`, `_.nan0`, `_.json`).
	 */
	it('How to detect directory configuration file?', () => {
		//import { Directory } from '@nan0web/db'
		console.info(Directory.isConfig('_.yaml')) // ← true
		console.info(Directory.isConfig('path/to/_.nan0')) // ← true
		console.info(Directory.isConfig('file.json')) // ← false
		assert.strictEqual(console.output()[0][1], true)
		assert.strictEqual(console.output()[1][1], true)
		assert.strictEqual(console.output()[2][1], false)
	})

	/**
	 * @docs
	 * ## Contributing
	 */
	it('How to participate? – [see CONTRIBUTING.md]($pkgURL/blob/main/CONTRIBUTING.md)', async () => {
		/** @docs */
		let text = await fs.loadDocument('CONTRIBUTING.md')
		if (text && typeof text === 'object' && text.content) text = text.content
		assert.ok(String(text).includes('# Contributing'))
	})

	/**
	 * @docs
	 * ## License
	 */
	it('ISC LICENSE – [see full text]($pkgURL/blob/main/LICENSE)', async () => {
		/** @docs */
		const text = await fs.loadDocument('LICENSE')
		assert.ok(String(text).includes('ISC'))
	})
}

describe('@nan0web/db README.md generation suite', testRender)

describe('Rendering README.md', async () => {
	let text = ''
	const format = new Intl.NumberFormat('en-US').format
	const parser = new DocsParser()
	const sourceCode = await fs.loadDocument('src/docs/README.md.js')
	text = String(parser.decode(sourceCode))

	it(`Document is rendered in README.md [${format(Buffer.byteLength(text))} bytes]`, async () => {
		await fs.saveDocument('README.md', text)
		const dataset = DatasetParser.parse(text, pkg.name)
		await fs.saveDocument('.datasets/README.dataset.jsonl', dataset)

		let textSaved = await fs.loadDocument('README.md')
		const content = typeof textSaved === 'string' ? textSaved : (textSaved?.content || JSON.stringify(textSaved))
		assert.ok(content.includes('# @nan0web/db'))
		assert.ok(content.includes('## License'))
	})
})
