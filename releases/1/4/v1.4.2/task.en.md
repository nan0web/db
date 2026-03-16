# Release v1.4.2: Preserve Literal Keys Containing `/`

> 🇺🇦 Українська версія: [task.md](./task.md)

## Scope

Fix handling of YAML keys containing the `/` (slash) character in `Data.flatten()` / `Data.unflatten()`. Currently, a key like `"Manage / Update Agent Workflows"` after a `flatten → unflatten` roundtrip becomes a nested object `{"Manage ": {" Update Agent Workflows": "..."}}`, which breaks `createT()` from `@nan0web/i18n`.

**Request source:** REQUESTS.md — Request #2026-03-16-01

## Root Cause

`Data.OBJECT_DIVIDER = '/'` is used as the path separator. `Data.flatten()` joins levels with `/`, and `Data.unflatten()` splits keys on `/`. If an original object key (from YAML) **already contains** `/`, the `flatten → unflatten` roundtrip destroys the structure.

## Solution: Escape Literal Slashes

Strategy — **Escape/Unescape**:
- `flatten()`: if an object key contains `OBJECT_DIVIDER`, replace it with an escape sequence.
- `unflatten()`: after splitting paths into segments, reverse-replace the escape sequence back to the original character.
- `find()`: same unescaping when searching by path.

Chosen approach: **character doubling** (`//` → means a literal `/` in the key). This is simpler than backslash-escaping and is compatible with existing URIs, which never have double slashes (normalization guarantees this).

## Architecture Audit

- [x] Ecosystem indexes read? — Yes
- [x] Analogues exist in packages? — No, this is the core Data utility
- [x] Data sources: YAML, nano, md, json, csv — YAML keys with `/`
- [x] UI standard compliance? — Internal core fix

## Acceptance Criteria (Definition of Done)

1. **Roundtrip**: `Data.unflatten(Data.flatten(obj))` returns identical object even if keys contain `/`.
2. **`Data.find()`**: `Data.find("key with / inside", obj)` correctly finds the value.
3. **Backward compatibility**: Existing tests (485 pass) remain green.
4. **`resolveReferences()`**: DB.fetch() correctly returns objects with keys containing `/`.
5. **REQUESTS.md** updated: status `✅ DONE`.
