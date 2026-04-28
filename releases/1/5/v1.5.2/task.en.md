---
version: 1.5.2
type: bugfix
status: completed
locale: en
models: []
---

[Українська версія](./task.md)

# 🚀 Mission: Fix Path Resolution Symmetry

- [x] Fix DB path resolution bug (absolute() forcing leading slash)
- [x] Implement contract-first fix (Red -> Green)
- [x] Ensure symmetric path handling for relative FS mounts
- [x] Verify no regressions in @nan0web/db and @nan0web/db-fs

## Technical Solution
1. **DBFS.location() Unification**: Replaced manual path concatenation with a unified `location()` method that uses `resolveSync` and `resolveAlias`.
2. **Smart Prefix Stripping**: Implemented a filtering mechanism in `location()` that strips leading slashes from virtual path segments (cwd, root, file) while preserving real host absolute paths (e.g., `/Users/...`).
3. **Alias Stability**: Restored and improved alias support in synchronous path resolution within `DBFS`.
4. **Verification**: Full test suite pass (700+ tests) across `@nan0web/db` and `@nan0web/db-fs`.

**Status**: Mission Accomplished. Ready for release.

## 🏁 Overview
Fixed a critical error where the `absolute()` method forcibly adds a leading slash, breaking relative mounting in filesystem drivers (DBFS).

## 👥 User Stories
> As a developer, I want to use relative paths for `root` in DBFS (e.g., `public/data`) so that the database deploys relative to the current working directory, rather than attempting to create folders at the disk root `/`.

## 🏗 Data-Driven Architecture
- Updated `DB/path.js`: added the ability to retrieve the path without the virtual prefix `/`.

## 🎯 Scope
- [x] Create a test confirming the "path hijacking" by the leading slash in `DB.absolute()`.
- [x] Implement a mechanism to retrieve a clean relative path.

## ✅ Acceptance Criteria (DoD)
- [x] Contract tests (`task.spec.js` / `task.test.js`) passed (Green).
- [x] `DB.absolute()` does not convert relative intents into system absolutes unnecessarily.
