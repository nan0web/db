# @nan0web/db

<!-- %PACKAGE_STATUS% -->

Agnostic document database and data manipulation utilities. Designed to be
flexible, minimal and powerful — the tool that supports any data format and
nested hierarchy with reference resolution, inheritance and global variables.

Inspired by `zero-is-not-a-number` rule of nan0web:
> Every data becomes a database.

Based on real use-cases, supports:
- **VFS Routing** — `mount()` composes multiple storage backends into one tree. Supports **Root Mount** (`prefix: ''`) for transparent catchment of all relative paths.
- **Fallback Chain** — `attach()` provides failover with transparent notifications
- **Model Hydration** — automatic transformation of plain objects into typed models
- officially registered **.nan0** as a native data extension
- object flattening/unflattening (with literal slash preservation)
- deep merging with reference handling
- async directory listing (for fs & fetch layers)
- stream-based progress during traversal

See how it works in [playground](#playground).

## Architecture

`DB` is a VFS Router. Mount different storage backends, attach fallbacks, hydrate models:

```
[App] → db.fetch('/media/logo.png')  → [S3 Driver]
        db.fetch('/cache/user_1')    → [Redis Driver]
        db.fetch('/play/demo-app')   → [FS Driver] → Document instance
```

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
### Example: Root Mount Support

You can mount a database at an empty prefix (`''`). This instance will catch
all relative paths that don't match more specific mount points. Extremely
useful for isolated playground environments.

How to mount a database as virtual root?
```js
import DB from "@nan0web/db"
const rootDB = new DB()
const targetDB = new DB({ data: new Map([['doc.json', { ok: true }]]) })
rootDB.mount('', targetDB)
// Accessing relative path transparently routes to targetDB
```
### Native `.nan0` Data Extension

Since `v1.4.4`, `.nan0` is a first-class citizen alongside `.json`. It is
automatically recognized as a data-containing file.

How to use native .nan0 data extension?
```js
import DB from "@nan0web/db"
const db = new DB({ data: new Map([['vault.nan0', { secret: 42 }]]) })
const result = await db.get('vault.nan0')
console.info(result) // ← { secret: 42 }
```
## JSON & Data

How to load Data document?
```js
import DB from "@nan0web/db"
const db = new DB()
const doc = await db.loadDocumentAs('.json', 'doc', { key: 'value' })
console.info(doc) // ← { key: "value" }
```
### Stream line-by-line reading

`.jsonl`, `.csv`, and `.csv0` formats safely stream line-by-line handling
chunk fragmentation natively via the standard Driver Protocol.

How to stream lines from data files?
```js
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
```
### Example: Using `get()` with default fallback

How to get or return default?
```js
import DB from "@nan0web/db"
const db = new DB()
const result = await db.get('missing-file.json', { defaultValue: {} })
console.info(result) // ← {}
```
### Example: Loading known document

How to get specific document?
```js
import DB from "@nan0web/db"
const db = new DB({ data: new Map([['file.txt', 'text']]) })
const result = await db.get('file.txt')
console.info(result) // ← "text"
```
## Usage with Real Context

### Resolving references and global vars

How to use document reference system?
```js
import DB from "@nan0web/db"
const db = new DB({
	data: new Map([
		['_/index.json', { global: 'value' }],
		['data.json', { $ref: '_/index.json', key: 'val' }],
	]),
})
await db.connect()
const res = await db.fetch('data.json')
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
const db = new DB({ data: new Map([['x.file', 'hello']]) })
const result = await db.get('x.file')
console.info(result) // ← "hello"
```
### `db.fetch(uri, FetchOptions)`
Like get, plus advanced features: refs, vars, inherit rules processing.

Supports extension lookup, e.g. find `.json` even when omitted.

How to load extended data?
```js
import DB from "@nan0web/db"
const db = new DB({ predefined: [['file.json', { value: 'loaded' }]] })
await db.connect()
const result = await db.fetch('file')
console.info(result) // ← { value: "loaded" }
```
### `db.set(uri, data)`
Sets document content and marks metadata updates.

How to save new content?
```js
import DB from "@nan0web/db"
const db = new DB()
const res = await db.set('file.text', 'save me!')
console.info(res) // ← "save me!"
console.info(db.data.get('file.text')) // ← "save me!"
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
	'x/y/z': 7,
	'arr/[0]/title': 'first',
	'arr/[1]/title': 'second',
})
console.info(nested) // ← { x: { y: { z: 7 } }, arr: [ { title: 'first' }, { title: 'second' } ] }
```
### Literal Slash Preservation

Since `v1.4.2`, keys containing the `OBJECT_DIVIDER` (default `/`) are automatically
escaped during flattening and restored during unflattening. This ensures that
i18n keys like `"Manage / Update"` are not incorrectly split into nested objects.

How to preserve literal slashes in keys?
```js
import { Data } from "@nan0web/db"
const obj = { 'Manage / Update': 'Керування' }
const flat = Data.flatten(obj)
// The slash is escaped to Unicode FRACTION SLASH '∕'
console.info(Object.keys(flat)[0]) // ← "Manage ∕ Update"
const unflat = Data.unflatten(flat)
console.info(unflat['Manage / Update']) // ← "Керування"
```
### `Data.merge(a, b)`
Deep merges two objects, handling array conflicts by replacing.

How to merge deeply?
```js
import { Data } from "@nan0web/db"
const a = { x: { one: 1 }, arr: [0] }
const b = { y: 'two', x: { two: 2 }, arr: [1] }
const merged = Data.merge(a, b)
console.info(merged) // ← { x: { one: 1, two: 2 }, y: 'two', arr: [ 1 ] }
```
### `Data.find(path, data)`

Finds value by string path or array path. Use array path to access keys containing `/`.

How to find value by path?
```js
import { Data } from "@nan0web/db"
const data = { 'I/O': 'value', nested: { item: 1 } }
console.info(Data.find('nested/item', data)) // ← 1
console.info(Data.find(['I/O'], data)) // ← "value"
```
## Path Utilities

`@nan0web/db/path` provides URI/path resolution functions for cross-platform use.
Supports normalization, basename/dirname extraction, and absolute/relative resolution.

### Import Path Utilities

How to import path utilities?
```js
import { normalize, basename, dirname, absolute, resolveSync } from '@nan0web/db/path'
console.info(normalize('a/b/../c')) // ← a/c
console.info(basename('path/to/file.txt')) // ← file.txt
console.info(dirname('path/to/file.txt')) // ← path/to/
console.info(absolute('/base', 'root', 'file')) // ← /base/root/file
console.info(resolveSync('/base', '.', 'file.txt')) // ← file.txt
```
### `normalize(...segments)`
Normalizes path segments, handling `../`, `./`, and duplicate slashes.

How to normalize path segments?
```js
import { normalize } from '@nan0web/db/path'
console.info(normalize('a/b/../c')) // ← a/c
console.info(normalize('a//b///c')) // ← a/b/c
console.info(normalize('dir/sub/')) // ← dir/sub/
```
### `basename(uri, [suffix])`
Extracts basename, optionally removing suffix or extension.

How to extract basename?
```js
import { basename } from '@nan0web/db/path'
console.info(basename('/dir/file.txt')) // ← file.txt
console.info(basename('/dir/file.txt', '.txt')) // ← file
console.info(basename('/dir/file.txt', true)) // ← file (remove ext)
console.info(basename('/dir/')) // ← dir/
```
### `dirname(uri)`
Extracts parent directory path.

How to extract dirname?
```js
import { dirname } from '@nan0web/db/path'
console.info(dirname('/a/b/file')) // ← /a/b/
console.info(dirname('/a/b/')) // ← /a/
console.info(dirname('/file')) // ← /
console.info(dirname('file.txt')) // ← .
```
### `extname(uri)`
Extracts file extension with dot (lowercase). Since `v1.5.3`, correctly ignores
dots in directory names of absolute paths.

How to extract extension?
```js
import { extname } from '@nan0web/db/path'
console.info(extname('file.TXT')) // ← .txt
console.info(extname('/Users/user/src/nan.web/apps/t.json')) // ← .json
console.info(extname('.gitignore')) // ← ''
console.info(extname('/dir/')) // ← ''
```
### `resolveSync(cwd, root, ...segments)`
Resolves segments relative to cwd/root (synchronous).

How to resolve path synchronously?
```js
import { resolveSync } from '@nan0web/db/path'
console.info(resolveSync('/base', '.', 'a/b/../c')) // ← a/c
```
### `relative(from, to)`
Computes relative path from `from` to `to`.

How to compute relative path?
```js
import { relative } from '@nan0web/db/path'
console.info(relative('/a/b', '/a/c')) // ← c
console.info(relative('/root/dir', '/root/')) // ← dir
```
### `absolute(cwd, root, ...segments)`
Builds absolute path/URL from cwd, root, and segments.

How to build absolute path?
```js
import { absolute } from '@nan0web/db/path'
console.info(absolute('/base', 'root', 'file')) // ← /base/root/file
console.info(absolute('https://ex.com', 'api', 'v1')) // ← https://ex.com/api/v1
```
### `isRemote(uri)` & `isAbsolute(uri)`
Checks if URI is remote or absolute.

How to check URI type?
```js
import { isRemote, isAbsolute } from '@nan0web/db/path'
console.info(isRemote('https://ex.com')) // ← true
console.info(isAbsolute('/abs/path')) // ← true
console.info(isAbsolute('./rel')) // ← false
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
console.log(await driver.read('/path')) // ← { data: 'from custom storage' }
```
### Using Driver in DB

How to attach driver to DB?
```js
import { DB, DBDriverProtocol } from '@nan0web/db'
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
## VFS Security

After mounting all databases, `seal()` locks the mount registry.
Any further `mount()` or `unmount()` calls will throw an error.
This prevents untrusted plugins from hijacking mount points at runtime.

### Sealing the mount registry

How to seal mount registry?
```js
import DB from '@nan0web/db'
const db = new DB()
const cache = new DB()
db.mount('cache', cache)
db.seal()
console.info(db.sealed) // ← true
```
### Reserved prefix error contract

URIs starting with `~` or `@` are reserved for mount points.
If accessed before mounting, DB throws a clear error with a hint:

How does DB handle unmounted reserved prefixes?
```js
import DB from '@nan0web/db'
const db = new DB()
```
## Domain Models

`DBConfig` and `RevisionInfo` provide standard data definitions.

### `DBConfig`

How to securely serialize connection arguments?
```js
import { DBConfig } from '@nan0web/db'
const config = new DBConfig('redis://yaro:pass123@redis.local:6379/cache')
console.info(config.protocol) // ← redis
console.info(config.safeDsn) // ← redis://yaro:***@redis.local:6379/cache
```
### `RevisionInfo`

How to standardize document history?
```js
import { RevisionInfo } from '@nan0web/db'
const ts = new Date('2026-04-06T00:00:00Z').toISOString()
const rev = new RevisionInfo({ sha: '1234567890abcdef', timestamp: ts })
console.info(rev.shortSha) // ← 1234567
```
### `Directory.isConfig(path)`

Checks if a path represents a directory configuration file (`_.yaml`, `_.nan0`, `_.json`).

How to detect directory configuration file?
```js
import { Directory } from '@nan0web/db'
console.info(Directory.isConfig('_.yaml')) // ← true
console.info(Directory.isConfig('path/to/_.nan0')) // ← true
console.info(Directory.isConfig('file.json')) // ← false
```
## Contributing

How to participate? – [see CONTRIBUTING.md]($pkgURL/blob/main/CONTRIBUTING.md)

## License

ISC LICENSE – [see full text]($pkgURL/blob/main/LICENSE)
