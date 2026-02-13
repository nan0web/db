# Requests Inbox

## From @industrialbank/credits (via @nan0web/i18n)

### 1. Republish with correct `dependencies`

**Priority**: Critical
**Date**: 2026-02-13

**Problem**:
Published `@nan0web/db@1.2.1` on npm has **empty** `dependencies`, but local `package.json` has:

```json
"dependencies": {
    "@nan0web/log": "1.1.1"
}
```

This breaks all transitive consumers (e.g. `npx @nan0web/i18n generate`).

**Fix**: Republish as v1.2.2 (patch) with current `package.json`.

**Verification**:

```bash
npm view @nan0web/db dependencies
# Expected: { '@nan0web/log': '1.1.1' }
```
