[Українська](task.md)

# Release 1.5.1: VFS Consistency & Global Store

## Scope
- **VFS Consistency**: Improved DBFS stability with deep mount nesting.
- **Store Path Resolution**: Optimized configuration file search in global store (`~/.nan0web/store`).

## Acceptance Criteria
- [x] Deeply nested mounts in DBFS must be stable.
- [x] Config files search in `~/.nan0web/store` must work correctly.

## Architecture Audit (Checklist)
- [x] Read Ecosystem Indexes
- [x] Existing analogies checked
- [x] Data sources: YAML, nan0, md, json, csv
- [x] Meets UI standards (Deep Linking)
