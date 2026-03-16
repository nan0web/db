> 🇺🇦 [Українська версія](./task.md)

# Release v1.4.1: Mount Architecture Security (seal + error contract)

## Mission

Protect the mount registry from unauthorized modifications after initialization (`seal()`) and provide clear error messages when accessing unmounted reserved prefixes (`~`, `@`).

## Scope

- [x] **`seal()`** — method to seal the mount registry. After calling, `mount()`/`unmount()` throw `Error`.
- [x] **`sealed` getter** — returns the current seal status.
- [x] **Error contract for `_findMount()`** — when accessing URIs with reserved prefixes (`~`, `@`) that were not mounted, a clear error is thrown with a hint.
- [x] **Unit tests** — full coverage for `seal()` and error contract (10 new tests).

## Acceptance Criteria (Definition of Done)

- [x] `seal()` blocks further `mount()`/`unmount()` calls
- [x] `sealed` getter correctly reflects the state
- [x] Existing mounts remain functional after `seal()`
- [x] `_findMount()` throws `Error` for unmounted `~`/`@` prefixes
- [x] `_findMount()` returns `null` for regular paths (as before)
- [x] Contract tests `releases/1/4/v1.4.1/task.spec.js` — Green
- [x] `npm run test:all` — Green

## Architecture Audit

- [x] Ecosystem indexes read? (Yes — DB is the core)
- [x] Analogues in packages? (No — seal() is a new security feature)
- [x] Data sources: N/A (changes only in mount infrastructure)
- [x] UI-standard compliance? (Yes — reserved prefixes `~`/`@` covered)
