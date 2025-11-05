# @nan0web/db

|[Status](https://github.com/nan0web/monorepo/blob/main/system.md#написання-сценаріїв)|Documentation|Test coverage|Features|Npm version|
|---|---|---|---|---|
 |🟢 `99.2%` |🧪 [English 🏴󠁧󠁢󠁥󠁮󠁧󠁿](https://github.com/nan0web/db/blob/main/README.md)<br />[Українською 🇺🇦](https://github.com/nan0web/db/blob/main/docs/uk/README.md) |🟢 `96.1%` |✅ d.ts 📜 system.md 🕹️ playground |1.0.2 |

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
## Java•Script types & Autocomplete
Package is fully typed with jsdoc and d.ts.

How many d.ts files should cover the source?

## Contributing

How to participate? – [see CONTRIBUTING.md](https://github.com/nan0web/db/blob/main/CONTRIBUTING.md)

## License

ISC LICENSE – [see full text](https://github.com/nan0web/db/blob/main/LICENSE)
