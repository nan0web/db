# @nan0web/db

|Package name|[Status](https://github.com/nan0web/monorepo/blob/main/system.md#написання-сценаріїв)|Documentation|Test coverage|Features|Npm version|
|---|---|---|---|---|---|
 |[@nan0web/db](https://github.com/nan0web/db/) |🟢 `98.8%` |🧪 [English 🏴󠁧󠁢󠁥󠁮󠁧󠁿](https://github.com/nan0web/db/blob/main/README.md)<br />[Українською 🇺🇦](https://github.com/nan0web/db/blob/main/docs/uk/README.md) |🟢 `93.7%` |✅ d.ts 📜 system.md 🕹️ playground |1.2.0 |

Agnostic document database and data manipulation utilities. Designed to be
flexible, minimal and powerful — the tool that supports any data format and
nested hierarchy with reference resolution, inheritance and global variables.

Inspired by `zero-is-not-a-number` rule of nan0web:
> Every data becomes a database.

Based on real use-cases, supports:
- object flattening/unflattening
- deep merging with reference handling
- async directory listing (for fs & fetch layers)
- stream-based progress during traversal

See how it works in [playground](#playground).

## Installation

How to install with npm?
```bash
npm install @nan0web/db
```

How to install with pnpm?
```bash
pnpm add @nan0web/db
```

How to install with yarn?
```bash
yarn add @nan0web/db
```

## Quick Start

How to load JSON document?
```js
import DB from "@nan0web/db"
const db = new DB()
const doc = await db.loadDocumentAs(".json", "doc", { key: "value" })
console.info(doc) // ← { key: "value" }
```
### Example: Using `get()` with default fallback

How to get or return default?
```js
import DB from "@nan0web/db"
const db = new DB()
const result = await db.get("missing-file.json", { defaultValue: {} })
console.info(result) // ← {}
```
### Example: Loading known document

How to get specific document?
```js
import DB from "@nan0web/db"
const db = new DB({ data: new Map([["file.txt", "text"]]) })
const result = await db.get("file.txt")
console.info(result) // ← "text"
```
## Usage with Real Context

### Resolving references and global vars

How to use document reference system?
```js
import DB from "@nan0web/db"
const db = new DB({
	data: new Map([
		["_/index.json", { global: "value" }],
		["data.json", { "$ref": "_/index.json", key: "val" }]
	])
})
await db.connect()
const res = await db.fetch("data.json")
console.info(res) // ← { global: "value", key: "val" }
```
## Playground

CLI sandbox for safe experiments:
```bash
git clone https://github.com/nan0web/db.git
cd db
npm install
npm run play
```

## API Reference

The heart of the package includes core tools to manage hierarchical data structures.

### `db.get(uri, GetOpts)`
Loads/returns document content from its URI.

* **Parameters**
  * `uri` *(string)* – Document URI.
  * `GetOpts.defaultValue` *(any)* – fallback if doc not found

* **Returns**
  * *(any)* – Document content or default value.

How to get document value?
```js
import DB from "@nan0web/db"
const db = new DB({ data: new Map([["x.file", "hello"]]) })
const result = await db.get("x.file")
console.info(result) // ← "hello"
```
### `db.fetch(uri, FetchOptions)`
Like get, plus advanced features: refs, vars, inherit rules processing.

Supports extension lookup, e.g. find `.json` even when omitted.

How to load extended data?
```js
import DB from "@nan0web/db"
const db = new DB({ predefined: [["file.json", { value: "loaded" }]] })
await db.connect()
const result = await db.fetch("file")
console.info(result) // ← { value: "loaded" }
```
### `db.set(uri, data)`
Sets document content and marks metadata updates.

How to save new content?
```js
import DB from "@nan0web/db"
const db = new DB()
const res = await db.set("file.text", "save me!")
console.info(res) // ← "save me!"
console.info(db.data.get("file.text")) // ← "save me!"
```
### `Data.flatten(data)`
Flattens nested object into paths as keys.

How to flatten object?
```js
import { Data } from "@nan0web/db"
const flat = Data.flatten({ x: { a: [1, 2, { b: 3 }] } })
console.info(flat) // ← { 'x/a/[0]': 1, 'x/a/[1]': 2, 'x/a/[2]/b': 3 }
```
### `Data.unflatten(data)`
Reconstructs nested structure from flat keys.

How to unflatten data?
```js
import { Data } from "@nan0web/db"
const nested = Data.unflatten({
	"x/y/z": 7,
	"arr/[0]/title": "first",
	"arr/[1]/title": "second"
})
console.info(nested) // ← { x: { y: { z: 7 } }, arr: [ { title: 'first' }, { title: 'second' } ] }
```
### `Data.merge(a, b)`
Deep merges two objects, handling array conflicts by replacing.

How to merge deeply?
```js
import { Data } from "@nan0web/db"
const a = { x: { one: 1 }, arr: [0] }
const b = { y: "two", x: { two: 2 }, arr: [1] }
const merged = Data.merge(a, b)
console.info(merged) // ← { x: { one: 1, two: 2 }, y: 'two', arr: [ 1 ] }
```
## Path Utilities

`@nan0web/db/path` provides URI/path resolution functions for cross-platform use.
Supports normalization, basename/dirname extraction, and absolute/relative resolution.

### Import Path Utilities

How to import path utilities?
```js
import { normalize, basename, dirname, absolute, resolveSync } from '@nan0web/db/path'
console.info(normalize("a/b/../c")) // ← a/c
console.info(basename("path/to/file.txt")) // ← file.txt
console.info(dirname("path/to/file.txt")) // ← path/to/
console.info(absolute("/base", "root", "file")) // ← /base/root/file
console.info(resolveSync("/base", ".", "file.txt")) // ← file.txt
```
### `normalize(...segments)`
Normalizes path segments, handling `../`, `./`, and duplicate slashes.

How to normalize path segments?
```js
import { normalize } from '@nan0web/db/path'
console.info(normalize("a/b/../c")) // ← a/c
console.info(normalize("a//b///c")) // ← a/b/c
console.info(normalize("dir/sub/")) // ← dir/sub/
```
### `basename(uri, [suffix])`
Extracts basename, optionally removing suffix or extension.

How to extract basename?
```js
import { basename } from '@nan0web/db/path'
console.info(basename("/dir/file.txt")) // ← file.txt
console.info(basename("/dir/file.txt", ".txt")) // ← file
console.info(basename("/dir/file.txt", true)) // ← file (remove ext)
console.info(basename("/dir/")) // ← dir/
```
### `dirname(uri)`
Extracts parent directory path.

How to extract dirname?
```js
import { dirname } from '@nan0web/db/path'
console.info(dirname("/a/b/file")) // ← /a/b/
console.info(dirname("/a/b/")) // ← /a/
console.info(dirname("/file")) // ← /
console.info(dirname("file.txt")) // ← .
```
### `extname(uri)`
Extracts file extension with dot (lowercase).

How to extract extension?
```js
import { extname } from '@nan0web/db/path'
console.info(extname("file.TXT")) // ← .txt
console.info(extname("archive.tar.gz")) // ← .gz
console.info(extname("noext")) // ← ''
console.info(extname("/dir/")) // ← ''
```
### `resolveSync(cwd, root, ...segments)`
Resolves segments relative to cwd/root (synchronous).

How to resolve path synchronously?
```js
import { resolveSync } from '@nan0web/db/path'
console.info(resolveSync("/base", ".", "a/b/../c")) // ← a/c
```
### `relative(from, to)`
Computes relative path from `from` to `to`.

How to compute relative path?
```js
import { relative } from '@nan0web/db/path'
console.info(relative("/a/b", "/a/c")) // ← c
console.info(relative("/root/dir", "/root/")) // ← dir
```
### `absolute(cwd, root, ...segments)`
Builds absolute path/URL from cwd, root, and segments.

How to build absolute path?
```js
import { absolute } from '@nan0web/db/path'
console.info(absolute("/base", "root", "file")) // ← /base/root/file
console.info(absolute("https://ex.com", "api", "v1")) // ← https://ex.com/api/v1
```
### `isRemote(uri)` & `isAbsolute(uri)`
Checks if URI is remote or absolute.

How to check URI type?
```js
import { isRemote, isAbsolute } from '@nan0web/db/path'
console.info(isRemote("https://ex.com")) // ← true
console.info(isAbsolute("/abs/path")) // ← true
console.info(isAbsolute("./rel")) // ← false
```
## Java•Script types & Autocomplete
Package is fully typed with jsdoc and d.ts.

How many d.ts files should cover the source?

## Drivers & Extensions

Drivers extend DB with storage backends. Extend `DBDriverProtocol` for custom logic.

### Basic Driver Extension

How to extend DBDriverProtocol?
```js
import { DBDriverProtocol } from '@nan0web/db'
class MyDriver extends DBDriverProtocol {
	async read(uri) {
		// Custom read logic
		return { data: 'from custom storage' }
	}
}
const driver = new MyDriver()
console.log(await driver.read("/path")) // ← { data: 'from custom storage' }
```
### Using Driver in DB

How to attach driver to DB?
```js
import { DB, DBDriverProtocol } from '@nan0web/db'
class SimpleDriver extends DBDriverProtocol {
	async read(uri) { return `Read: ${uri}` }
	async write(uri, data) { return true }
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
```
## Authentication & Authorization

Use `AuthContext` for role-based access in DB operations.

### Basic AuthContext Usage

How to create AuthContext?
```js
import { AuthContext } from '@nan0web/db'
const ctx = new AuthContext({ role: 'user', roles: ['user', 'guest'] })
console.info(ctx.hasRole('user')) // ← true
console.info(ctx.role) // ← user
```
### AuthContext with DB Access

How to use AuthContext in DB?
```js
import { DB, AuthContext } from '@nan0web/db'
const db = new DB()
const ctx = new AuthContext({ role: 'admin' })
await db.set('secure/file.txt', 'secret', ctx)
console.info(await db.get('secure/file.txt', {}, ctx)) // ← secret
```
### Handling Access Failures

How to handle auth failures?
```js
import { AuthContext } from '@nan0web/db'
const ctx = new AuthContext()
ctx.fail(new Error('Access denied'))
console.info(ctx.fails) // ← [Error: Access denied]
console.info(ctx.hasRole('admin')) // ← false
```
## Contributing

How to participate? – [see CONTRIBUTING.md](https://github.com/nan0web/db/blob/main/CONTRIBUTING.md)

## License

ISC LICENSE – [see full text](https://github.com/nan0web/db/blob/main/LICENSE)
