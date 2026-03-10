# Release v1.4.0: Aliases Protocol & Stabilization

## Mission

Add URI aliases support at the base `DB` class level, fix regression in CrossDriver tests, and close release v1.3.1 (migrate contract tests to regression).

## Scope

- [ ] **Aliases Protocol** (REQUESTS.md #2026-03-10-01): add `aliases` field to DB constructor and `resolveAlias(uri)` method.
- [ ] **CrossDriver test fix**: fix 2 failing tests in `CrossDriver.test.js` (expectations don't match v1.3.3 behavior with visited tracking).
- [ ] **Close v1.3.1**: migrate `releases/1/3/v1.3.1/task.spec.js` → `src/test/releases/1/3/v1.3.1/task.test.js`.

## Acceptance Criteria (Definition of Done)

- [ ] Contract tests `releases/1/4/v1.4.0/task.spec.js` pass (Green).
- [ ] `npm run test:all` passes completely.
- [ ] `CrossDriver.test.js` — 4/4 Green.
- [ ] `aliases` support integrated into the base DB class.

## Architecture Audit

- [x] Have ecosystem indexes been read? (Yes — DB is the core)
- [x] Do analogues exist in packages? (Aliases — new functionality, no duplication)
- [x] Data sources: YAML, MD, JSON (via drivers).
- [x] Does it comply with the UI standard (Deep Linking)? (Aliases — transparent URI projection).
