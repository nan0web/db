# v1.4.7 - Directory Read Prevention & Browse Utility

## Scope
- Update `loadDocument` and extension resolution logic to safely skip directories and strictly verify `stats.isFile`. This prevents the DB from erroneously attempting to read or fetch a directory as if it were a file when names conflict.
- Implement `DB.prototype.browse`, a recursive file browsing utility (`ls -r` style).
- Standardize internal `@nan0web` package dependencies to use the `workspace:*` Protocol.

## Acceptance Criteria
- [x] Architecture Audit passed:
  - [x] Package indices verified for anomalies.
  - [x] No duplicate logic found in the ecosystem.
  - [x] YAML / DB-FS compliance retained.
- [ ] Directory paths do not crash `loadDocument` and are ignored if no file extension explicitly resolves to a file.
- [ ] DB correctly resolves files using extension fallback (e.g., `dir.json`) even if a directory named `dir` exists.
- [ ] `db.browse()` accurately yields document entries recursively, supporting `depth` and `includeDirs` options.
