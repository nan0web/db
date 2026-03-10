# 🏗️ Architecture: @nan0web/db

> **Every data becomes a database.**

---

## 🧭 Phase 1: Philosophy & Abstraction (The Seed)

### Mission

`@nan0web/db` is the **core** of the `nan0web` ecosystem. The package implements the idea: any data source (file system, browser, Redis, MongoDB, Neo4j, HTTP API) becomes a single **document database** through a unified URI addressing interface.

This is not an ORM. This is not a query builder. This is a **VFS Router** (Virtual File System Router), where:

- `cwd` — external context (host or physical path)
- `root` — internal root / mount point
- `pathname` — relative request path

**URI Formula: `cwd + root + pathname`** — the foundation of the entire system.

### Key Principles

1. **Agnostic** — the base `DB` class knows nothing about specific storage. Each storage is a driver.
2. **Document Inheritance** — global variables (`_/index.json`) cascade down to child documents.
3. **References ($ref)** — documents can reference other documents and their fragments.
4. **Extension** — `$ref` at the top level of a document extends it with data from another document.
5. **Data-Driven** — data is the source of truth; UI and logic are built around it.

### Glossary

| Term               | Definition                                                       |
| ------------------ | ---------------------------------------------------------------- |
| **DB**             | Base VFS router working with Map<string, any> in memory          |
| **Driver**         | Concrete storage implementation (DBFS, DBBrowser, DBRedis, etc.) |
| **Document**       | A unit of data addressed via URI                                 |
| **Directory**      | Hierarchical grouping unit, may have a global document `_`       |
| **DirectoryIndex** | Directory metadata (entries, stat, columns)                      |
| **DocumentStat**   | Document metadata (size, mtimeMs, exists)                        |
| **DocumentEntry**  | Document entry point with metadata                               |
| **StreamEntry**    | Progress event during tree traversal                             |
| **Data**           | Manipulation utilities (flatten, unflatten, merge, clone)        |
| **AuthContext**    | Authentication context (role, roles, fails)                      |
| **FetchOptions**   | Extended loading options (ref, inherit, extensions)              |
| **GetOptions**     | Basic loading options (defaultValue)                             |
| **Mount**          | VFS mounting — attaching a sub-database at a URI prefix          |
| **Attach**         | Fallback chain — adding a backup database                        |
| **Model**          | Schema class for hydrating plain objects (Model-as-Schema)       |

---

## 📐 Phase 2: Domain Modeling (Data-Driven Models)

### `src/` Structure

```
src/
├── DB/
│   ├── DB.js              # Main class (~68KB): VFS routing, mount, attach, fetch, get, set, model
│   ├── AuthContext.js      # Authorization context (role, hasRole, fail)
│   ├── DriverProtocol.js   # Abstract protocol for drivers
│   ├── ExtendedDB.js       # Minimal extension for testing
│   ├── FetchOptions.js     # fetch() options with inheritance support
│   ├── GetOptions.js       # get() options with defaultValue
│   ├── path.js             # URI utilities (normalize, basename, dirname, absolute, resolveSync, relative)
│   └── index.js            # Re-export DB + types
├── Data.js                 # Static utilities: flatten, unflatten, merge, clone, refs
├── Directory.js            # Directory constants (FILE='_', INDEX='index', DATA_EXTNAMES)
├── DirectoryIndex.js       # Directory index (entries, stat, columns, formats)
├── DocumentEntry.js        # Document metadata during listing
├── DocumentStat.js         # File stat (size, mtimeMs, exists, isDirectory)
├── StreamEntry.js          # Progress event during traversal
└── index.js                # Main re-export
```

### Key API

#### VFS Router — `mount()` / `unmount()`

```js
const db = new DB()
db.mount('/media', s3Driver)
db.mount('/cache', redisDriver)
db.mount('/local', fsDriver)

await db.fetch('/media/logo.png') // → S3
await db.fetch('/cache/user_1') // → Redis
await db.fetch('/local/config') // → FileSystem
```

Longest-prefix matching: for URI `/local/deep/path`, mount `/local` will be found.

#### Fallback Chain — `attach()`

```js
const primary = new DBFS({ root: './data' })
const fallback = new DB({ predefined: [['defaults.json', { theme: 'dark' }]] })
primary.attach(fallback)

// If document not found in primary, searches in fallback
await primary.fetch('defaults') // → { theme: 'dark' }
```

#### Model Hydration — `model()`

```js
class ProductModel {
  static name = { default: '', help: 'Product name' }
  static price = { default: 0, type: 'number' }
  constructor(data) {
    Object.assign(this, data)
  }
}

db.model('/products', ProductModel)
await db.set('products/item.json', { name: 'Widget', price: 42 })
const product = await db.fetch('products/item')
// product instanceof ProductModel === true
```

#### Schema Validation — `validate()`

```js
const result = await db.validate('products/item', { price: 'not-a-number' })
// { valid: false, errors: [{ field: 'price', expected: 'number' }] }
```

#### Path Utilities — `@nan0web/db/path`

Separate submodule (exposed via `exports["./path"]`) with URI utilities:
`normalize`, `basename`, `dirname`, `extname`, `absolute`, `resolveSync`, `relative`, `isRemote`, `isAbsolute`.

### Drivers (Extensions)

| Driver        | Package               | Storage                                       |
| ------------- | --------------------- | --------------------------------------------- |
| **DBFS**      | `@nan0web/db-fs`      | File system (YAML, JSON, Nano, CSV, Markdown) |
| **DBBrowser** | `@nan0web/db-browser` | IndexedDB + fetch() with caching              |
| **DBRedis**   | (planned)             | Redis with TTL                                |
| **DBMongo**   | (planned)             | MongoDB with collections                      |
| **DBNeo4j**   | (planned)             | Neo4j (graph relationships)                   |

All drivers inherit from `DBDriverProtocol`, which defines the contract:
`loadDocument`, `saveDocument`, `dropDocument`, `writeDocument`, `moveDocument`, `statDocument`, `listDir`.

### Data Sources

- **Map<string, any>** — in-memory (base DB)
- **predefined** — initial data via `[uri, data]` pairs array
- **YAML/JSON/Nano/CSV/Markdown** — via `@nan0web/db-fs` driver
- **HTTP/fetch** — via `@nan0web/db-browser`

---

## 🛠 Phase 3: Logic Verification (CLI-First)

### Testing

The package is covered by **453+ unit tests** (node:test + assert/strict):

| File                     | Focus                                                            |
| ------------------------ | ---------------------------------------------------------------- |
| `DB.test.js`             | Core logic: connect, get, set, fetch, push, resolve, inheritance |
| `DB.mount.test.js`       | VFS mounting and routing                                         |
| `DB.fallback.test.js`    | Attach / fallback chain                                          |
| `DB.model.test.js`       | Model hydration + validation                                     |
| `DB.batch.test.js`       | getAll / setAll                                                  |
| `DB.watch.test.js`       | Watcher + change events                                          |
| `DB.list.test.js`        | listDir + DirectoryIndex                                         |
| `DB.path.test.js`        | Path utilities                                                   |
| `DB.auth.test.js`        | AuthContext integration                                          |
| `DB.dbs.test.js`         | DB.isDB() duck typing                                            |
| `DB.index.test.js`       | Index file handling                                              |
| `CrossDriver.test.js`    | Cross-driver interop (db ↔ db-fs)                                |
| `Data.test.js`           | flatten, unflatten, merge, clone                                 |
| `Directory.test.js`      | Directory constants + behavior                                   |
| `DirectoryIndex.test.js` | Index formats (rows, text, object, ref)                          |
| `DocumentEntry.test.js`  | Entry metadata                                                   |
| `DocumentStat.test.js`   | Stat contract                                                    |
| `StreamEntry.test.js`    | Progress events                                                  |
| `DriverProtocol.test.js` | Protocol compliance                                              |
| `README.md.js`           | ProvenDoc (executable README)                                    |

#### Test Pipeline (package.json scripts)

```
test          → node --test "src/**/*.test.js"
test:docs     → node --test src/README.md.js
test:release  → node --test "releases/**/*.test.js"
test:all      → test + test:docs + build + knip + audit
```

### CLI Integration

The package has a CLI sandbox (`npm run play`), which through `@nan0web/ui-cli` allows interactive database operations from the terminal.

---

## 🪐 Phase 4: Sovereign Workbench (The Master IDE)

### Playground (`play/`)

The `play/` directory contains an interactive sandbox for DB experiments:

```bash
npm run play
# or
node play/main.js
```

The sandbox allows creating, reading, modifying, and deleting documents via the CLI interface.

### Documentation Integration

- `README.md` — public API documentation (ProvenDoc, generated from tests)
- `docs/uk/README.md` — Ukrainian README version
- `docs/uk/project.md` — architectural documentation (this file, in Ukrainian)

---

## 🎨 Phase 5: Theming & Interface

This phase is currently **not implemented** in the `@nan0web/db` package, as it is a backend/core package without its own UI. Visual theming occurs at the consumer package level (`@nan0web/ui-react`, `@nan0web/ui-lit`, `@nan0web/ui-cli`).

The package provides Data-Driven support for UI through:

- **Model-as-Schema** — declarative metadata for auto-generating forms
- **validate()** — server-side validation for UI
- **AuthContext** — access control for UI elements

---

## 📊 Ecosystem Role

```
@nan0web/db (this package)
├── @nan0web/db-fs         — File System
├── @nan0web/db-browser    — Browser + IndexedDB
├── @nan0web/db-fetch      — HTTP fetch
└── (planned)
    ├── @nan0web/db-redis   — Redis
    ├── @nan0web/db-mongo   — MongoDB
    └── @nan0web/db-neo4j   — Neo4j
```

Dependencies:

- **runtime**: `@nan0web/log` (logging)
- **peer**: `@nan0web/types` (JSDoc types)
- **dev**: `@nan0web/db-fs`, `@nan0web/test`, `@nan0web/release`, `@nan0web/ui-cli`

---

## 🏁 Readiness Checklist

- [x] Clear mission: "Every data becomes a database"
- [x] Base abstraction: VFS Router with mount/attach
- [x] Domain models: Model-as-Schema with `validate()`
- [x] CLI: playground (`npm run play`)
- [ ] Sandbox: needs `blocks-sandbox` integration
- [ ] Docs in Sandbox: needs SSG generation
- [x] Typing: full JSDoc + d.ts coverage
