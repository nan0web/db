# @nan0web/db Roadmap

## Done ✅

- ~~**Universal Data Architecture 2.0**~~: VFS mount routing, fallback chain, DB.isDB(), Model hydration
- ~~**Database federation**~~: `mount()` + `attach()` cover multi-DB composition
- ~~**Unified driver interface**~~: `DBDriverProtocol` is stable
- ~~**Markdown-as-Data**~~: Implemented in `@nan0web/db-fs` (frontmatter + content)
- ~~**Path utilities**~~: `cwd` + `root` based resolution (`resolveSync`, `absolute`) in `DB/path.js`
- ~~**`extract()` refactor**~~: Scoped sub-databases with prefix stripping
- ~~**Batch operations**~~: `getAll(uris[])` parallel read, `setAll(entries[])` batch write
- ~~**Schema validation**~~: `validate(uri)` checks data against Model-as-Schema static fields
- ~~**Watcher support**~~: `watch(uri, cb)` / `unwatch(uri)` with prefix matching, emit('change')
- ~~**Cache metrics**~~: `emit('cache', { hit, uri })` on every `get()` call
- ~~**Streaming fetch**~~: `fetchStream(uri)` returns ReadableStream, overridable by drivers
- ~~**DBDriverProtocol tests**~~: Full test suite — 26 tests covering all protocol methods + delegation
- ~~**Knip + Audit**~~: `knip --production` and `pnpm audit --prod` in test:all pipeline

## Next

### Cross-driver Compatibility

- Integration tests: `db-fs` ↔ `db-fetch` ↔ base `DB` interop
- Edge case coverage for circular refs and deep inheritance chains

### Telemetry → `@nan0web/telemetry`

- Performance benchmarks, metrics aggregation, reporting
- See [`../telemetry/next.md`](../telemetry/next.md)

#.
