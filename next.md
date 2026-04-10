# 🏗️ Architecture Audit — Healing Report

**Score: {passed}/{total} ({pct}%)**

## Issues Found
- [x] [feature] `DB.js`: Fixed directory/file name collision natively via strict `isFile` checks
- [skip] [exports] src/index.js: `Default export found in {file} — only named exports allowed` (cross-package dependency)
- [x] [exports] src/domain/index.js: `src/domain/ exists but src/domain/index.js is missing`
- [skip] [domain] Class field outside constructor (skipped for non-model files)

## Recommended Subagents
- `@[/inspect-anti-pattern]`
- `@[/inspect-models]`
