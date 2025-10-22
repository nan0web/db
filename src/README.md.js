import { describe, it, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { NoConsole } from "@nan0web/log"
import FS from "@nan0web/db-fs"
import { DocsParser, DatasetParser } from "@nan0web/test"
import { DB, Data } from './index.js'

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
	it("How to install with npm?", () => {
		/**
		 * ```bash
		 * npm install @nan0web/db
		 * ```
		 */
		assert.equal(pkg.name, "@nan0web/db")
	})
	/**
	 * @docs
	 */
	it("How to install with pnpm?", () => {
		/**
		 * ```bash
		 * pnpm add @nan0web/db
		 * ```
		 */
		assert.equal(pkg.name, "@nan0web/db")
	})
	/**
	 * @docs
	 */
	it("How to install with yarn?", () => {
		/**
		 * ```bash
		 * yarn add @nan0web/db
		 * ```
		 */
		assert.equal(pkg.name, "@nan0web/db")
	})

	/**
	 * @docs
	 * ## Quick Start
	 */
	it("How to load JSON document?", async () => {
		//import DB from "@nan0web/db"
		const db = new DB()
		const doc = await db.loadDocumentAs(".json", "doc", { key: "value" })
		console.info(doc) // ← { key: "value" }
		assert.deepStrictEqual(console.output()[0][1], { key: "value" })
	})

	/**
	 * @docs
	 * ### Example: Using `get()` with default fallback
	 */
	it("How to get or return default?", async () => {
		//import DB from "@nan0web/db"
		const db = new DB()
		const result = await db.get("missing-file.json", { defaultValue: {} })
		console.info(result) // ← {}
		assert.deepStrictEqual(console.output()[0][1], {})
	})

	/**
	 * @docs
	 * ### Example: Loading known document
	 */
	it("How to get specific document?", async () => {
		//import DB from "@nan0web/db"
		const db = new DB({ data: new Map([["file.txt", "text"]]) })
		const result = await db.get("file.txt")
		console.info(result) // ← "text"
		assert.equal(console.output()[0][1], "text")
	})

	/**
	 * @docs
	 * ## Usage with Real Context
	 *
	 * ### Resolving references and global vars
	 */
	it("How to use document reference system?", async () => {
		//import DB from "@nan0web/db"
		const db = new DB({
			data: new Map([
				["_/index.json", { global: "value" }],
				["data.json", { "$ref": "_/index.json", key: "val" }]
			])
		})
		const res = await db.fetch("data.json")
		console.info(res) // ← { global: "value", key: "val" }
		assert.deepStrictEqual(console.output()[0][1], { global: "value", key: "val" })
	})

	/**
	 * @docs
	 * ## Playground
	 */
	it("CLI sandbox for safe experiments:", () => {
		/**
		 * ```bash
		 * git clone https://github.com/nan0web/db.git
		 * cd db
		 * npm install
		 * npm run play
		 * ```
		 */
		assert.ok(String(pkg.scripts?.play).includes("node play"))
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
	it("How to get document value?", async () => {
		//import DB from "@nan0web/db"
		const db = new DB({ data: new Map([["x.file", "hello"]]) })
		const result = await db.get("x.file")
		console.info(result) // ← "hello"
		assert.equal(console.output()[0][1], "hello")
	})

	/**
	 * @docs
	 * ### `db.fetch(uri, FetchOptions)`
	 * Like get, plus advanced features: refs, vars, inherit rules processing.
	 *
	 * Supports extension lookup, e.g. find `.json` even when omitted.
	 */
	it("How to load extended data?", async () => {
		//import DB from "@nan0web/db"
		const db = new DB({ predefined: [["file.json", { value: "loaded" }]] })
		await db.connect()
		const result = await db.fetch("file")
		console.info(result) // ← { value: "loaded" }
		assert.deepStrictEqual(console.output()[0][1], { value: "loaded" })
	})

	/**
	 * @docs
	 * ### `db.set(uri, data)`
	 * Sets document content and marks metadata updates.
	 */
	it("How to save new content?", async () => {
		//import DB from "@nan0web/db"
		const db = new DB()
		const res = await db.set("file.text", "save me!")
		console.info(res) // ← "save me!"
		console.info(db.data.get("file.text")) // ← "save me!"
		assert.equal(console.output()[0][1], "save me!")
		assert.equal(console.output()[1][1], "save me!")
	})

	/**
	 * @docs
	 * ### `Data.flatten(data)`
	 * Flattens nested object into paths as keys.
	 */
	it("How to flatten object?", () => {
		//import { Data } from "@nan0web/db"
		const flat = Data.flatten({ x: { a: [1, 2, { b: 3 }] } })
		console.info(flat) // ← { 'x/a/[0]': 1, 'x/a/[1]': 2, 'x/a/[2]/b': 3 }
		assert.deepStrictEqual(console.output()[0][1], {
			"x/a/[0]": 1,
			"x/a/[1]": 2,
			"x/a/[2]/b": 3
		})
	})

	/**
	 * @docs
	 * ### `Data.unflatten(data)`
	 * Reconstructs nested structure from flat keys.
	 */
	it("How to unflatten data?", () => {
		//import { Data } from "@nan0web/db"
		const nested = Data.unflatten({
			"x/y/z": 7,
			"arr/[0]/title": "first",
			"arr/[1]/title": "second"
		})
		console.info(nested) // ← { x: { y: { z: 7 } }, arr: [ { title: 'first' }, { title: 'second' } ] }
		assert.deepStrictEqual(console.output()[0][1], {
			x: { y: { z: 7 } },
			arr: [{ title: "first" }, { title: "second" }]
		})
	})

	/**
	 * @docs
	 * ### `Data.merge(a, b)`
	 * Deep merges two objects, handling array conflicts by replacing.
	 */
	it("How to merge deeply?", () => {
		//import { Data } from "@nan0web/db"
		const a = { x: { one: 1 }, arr: [0] }
		const b = { y: "two", x: { two: 2 }, arr: [1] }
		const merged = Data.merge(a, b)
		console.info(merged) // ← { x: { one: 1, two: 2 }, y: 'two', arr: [ 1 ] }
		assert.deepStrictEqual(console.output()[0][1], {
			x: { one: 1, two: 2 },
			y: "two",
			arr: [1]
		})
	})

	/**
	 * @docs
	 * ## Java•Script types & Autocomplete
	 * Package is fully typed with jsdoc and d.ts.
	 */
	it("How many d.ts files should cover the source?", () => {
		assert.equal(pkg.types, "./types/index.d.ts")
	})

	/**
	 * @docs
	 * ## Contributing
	 */
	it("How to participate? – [see CONTRIBUTING.md]($pkgURL/blob/main/CONTRIBUTING.md)", async () => {
		/** @docs */
		const text = await fs.loadDocument("CONTRIBUTING.md")
		assert.ok(String(text).includes("# Contributing"))
	})

	/**
	 * @docs
	 * ## License
	 */
	it("ISC LICENSE – [see full text]($pkgURL/blob/main/LICENSE)", async () => {
		/** @docs */
		const text = await fs.loadDocument("LICENSE")
		assert.ok(String(text).includes("ISC"))
	})
}

describe("@nan0web/db README.md generation suite", testRender)

describe("Rendering README.md", async () => {
	let text = ""
	const format = new Intl.NumberFormat("en-US").format
	const parser = new DocsParser()
	text = String(parser.decode(testRender))
	await fs.saveDocument("README.md", text)
	const dataset = DatasetParser.parse(text, pkg.name)
	await fs.saveDocument(".datasets/README.dataset.jsonl", dataset)

	it(`Document is rendered in README.md [${format(Buffer.byteLength(text))} bytes]`, async () => {
		const text = await fs.loadDocument("README.md")
		assert.ok(text.includes("# @nan0web/db"))
		assert.ok(text.includes("## License"))
	})
})
