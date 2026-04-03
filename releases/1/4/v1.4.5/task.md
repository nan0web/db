# Seed for `@nan0web/db` v1.4.5 Patch

This document contains release information for the upcoming patch of `@nan0web/db`. The patch resolves a critical bug in `DB._findMount` affecting isolated playgrounds.

## Release Metadata

- **Target Package:** `@nan0web/db`
- **Target Version:** `1.4.5`
- **Type:** Patch

## The Issue

When mounting a root DBFS instance (`db.mount('', targetDb)`) in isolated environments (like the new Playground Runner for UI-CLI), relative UI paths like `atoms/BranchCard` failed to match inside `_findMount`.

## Acceptance Criteria

- [ ] `db.mount('', targetDb)` handles relative paths correctly via `_findMount`.
- [ ] `_findMount('some/path')` returns the mounted DB when root mount (`''`) exists.
- [ ] Sub-URI is correctly stripped/padded for the root mount.

## Architecture Audit

- [x] Чи прочитано Індекси екосистеми?
- [x] Чи існують аналоги в пакетах?
- [x] Джерела даних: DBFS routing
- [x] Чи відповідає UI-стандарту?
