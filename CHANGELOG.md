# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2026-02-25

### Added

- **Batch operations**: `getAll(uris[])` for parallel reads, `setAll(entries[])` for batch writes — both return `Map<string, any>`.
- **Schema validation**: `validate(uri, data?)` checks data against Model-as-Schema static fields with `default` descriptors. Returns `{ valid, errors[] }`.
- **Watcher support**: `watch(uri, cb)` / `unwatch(uri)` with prefix matching. Returns unsubscribe function. Fires on `set()`, `saveDocument()`, `dropDocument()`.
- **Cache metrics**: `emit('cache', { hit, uri })` on every `get()` call for telemetry integration.
- **Streaming fetch**: `fetchStream(uri)` returns `ReadableStream`. Base implementation wraps `fetch()` into a single-chunk stream; FS/network drivers can override for true chunked streaming.
- **Change events**: `emit('change', { uri, type, data })` on `set()` (`type: 'set'`), `saveDocument()` (`type: 'save'`), `dropDocument()` (`type: 'drop'`).
- **VFS mount routing**: `mount(prefix, db)` / `unmount(prefix)` with longest-prefix matching. All core operations (`get`, `set`, `stat`, `fetch`, `saveDocument`, `dropDocument`) are transparently routed through mounted DBs.
- **Fallback chain**: `attach()` refactored — `fetch()` tries attached `dbs[]` on primary miss.
- **Model hydration**: `model(prefix, ModelClass)` for URI-prefix-based Model registration. `fetch()` auto-hydrates via `Model.from(data)` or `new Model(data)`.
- **`DB.isDB()` static**: duck-typing check for cross-package `instanceof` safety.
- **`on(event, cb)` / `emit(event, data)`**: lightweight event system with `'fallback'` transparency.
- **Knip integration**: `knip.json` config + `"knip": "knip --production"` script added to `test:all` pipeline.
- **`$clear` array merge directive**: `Data.merge()` supports `[{ $clear: true }, ...items]` to replace inherited arrays instead of appending.

### Changed

- **Inheritance refactor**: inline inheritance loop extracted to `getInheritance(uri)` method for clarity and reuse.
- **`MountableDB.js` removed**: mount logic is now native to base `DB` class.
- **DriverProtocol tests**: expanded from flat assertions to structured `describe` blocks — 26 tests covering all protocol methods + delegation.
- **Types cleanup**: `| undefined` annotations refined to proper optional params across `DB.d.ts`, `Data.d.ts`, `DriverProtocol.d.ts`, `path.d.ts`, `DirectoryIndex.d.ts`.
- **Test suite**: expanded to **449 tests** (from 401), all passing. New test files: `DB.batch.test.js`, `DB.watch.test.js`.

## [1.2.2] - 2026-02-13

### Fixed

- **Dependencies**: Added missing `@nan0web/log` dependency to `package.json` to resolve runtime errors in consuming packages.
- **Refactoring**: internal utility functions migrated to `@nan0web/types` (clone, merge, oneOf) for better type safety and consistency.
- **Logging**: Integrated `@nan0web/log` for standardized logging.
- **Code Style**: Enforced project-wide formatting standards (Tabs, No Semicolons) across all source files.

### Changed

- Updated `devDependencies` to use caret (`^`) versioning for better compatibility.
- Improved explicit typing in JSDoc signatures.
