[Українська](task.md)

# Release v1.5.0: Stream Architecture Refactoring

## Goal

- Move sequential reading logic (for JSONL and CSV) to `DBDriverProtocol` level from `DB.js`.
- Guarantee that `.jsonl` and `.csv` formats safely iterate line by line even if chunks are fragmented in the middle.
- Verify that inaccessible and non-existent files throw correct errors.
- Ensure that binary or unhandled files (.bin) return the original stream.

## Acceptance Criteria (Definition of Done)

- [x] `stream` logic removed from `DB.js` and moved to `DriverProtocol.js`.
- [x] Contract tests (`.spec.js`) written covering chunk fragmentation, correct splitting, and error handling.
- [x] All tests pass successfully (green).

## Architecture Audit (Checklist)

- [x] Ecosystem Indexes read?
- [x] Analogies exist in packages?
- [x] Data sources: YAML, nan0, md, json, csv?
- [x] Meets UI-standard (Deep Linking)?
