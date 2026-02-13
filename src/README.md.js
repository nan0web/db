import { describe, it, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { NoConsole } from '@nan0web/log'
import FS from '@nan0web/db-fs'
import { DocsParser, DatasetParser } from '@nan0web/test'
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
} from './index.js'
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
} from './DB/path.js'

const fs = new FS()
let pkg

before(async () => {
	const doc = await fs.loadDocument('package.json', {})
	pkg = doc || {}
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
	 * - object flattening/unflattening
	 * - deep merging with reference handling
	 * - async directory listing (for fs & fetch layers)
	 * - stream-based progress during traversal
	 *
	 * See how it works in [playground](#playground).
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
	 */
	it('How to load JSON document?', async () => {
		//import DB from "@nan0web/db"
		const db = new DB()
		const doc = await db.loadDocumentAs('.json', 'doc', { key: 'value' })
		console.info(doc) // ← { key: "value" }
		assert.deepStrictEqual(console.output()[0][1], { key: 'value' })
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
	 * Extracts file extension with dot (lowercase).
	 */
	it('How to extract extension?', () => {
		//import { extname } from '@nan0web/db/path'
		console.info(extname('file.TXT')) // ← .txt
		console.info(extname('archive.tar.gz')) // ← .gz
		console.info(extname('noext')) // ← ''
		console.info(extname('/dir/')) // ← ''
		assert.equal(console.output()[0][1], '.txt')
		assert.equal(console.output()[1][1], '.gz')
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
	 * ## Contributing
	 */
	it('How to participate? – [see CONTRIBUTING.md]($pkgURL/blob/main/CONTRIBUTING.md)', async () => {
		/** @docs */
		const text = await fs.loadDocument('CONTRIBUTING.md')
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
	text = String(parser.decode(testRender))
	await fs.saveDocument('README.md', text)
	const dataset = DatasetParser.parse(text, pkg.name)
	await fs.saveDocument('.datasets/README.dataset.jsonl', dataset)

	it(`Document is rendered in README.md [${format(Buffer.byteLength(text))} bytes]`, async () => {
		const text = await fs.loadDocument('README.md')
		assert.ok(text.includes('# @nan0web/db'))
		assert.ok(text.includes('## License'))
	})
})
