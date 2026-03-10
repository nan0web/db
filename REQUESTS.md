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

## From nan0web.app (Documentation Engine)

### Request #2026-03-10-01: Aliases Protocol Support

- **Priority:** 🟡 Medium
- **Status:** ✅ DONE (11.03.2026)

**Problem:**
Документаційний рушій `nan0web.app` потребує механізму **віртуальної проекції** файлів (aliases), де запит до `docs/en/README.md` прозоро повертає вміст кореневого `./README.md` без фізичного копіювання.

**Scope:**
Додати підтримку `aliases` (Map<string, string>) на рівні базового класу `DB`, щоб будь-який драйвер (db-fs, db-browser, db-redis) міг використовувати цей механізм.

```js
// DB constructor — нове поле
this.aliases = input.aliases ?? {}
```

```js
// DB.resolveAlias(uri) — новий метод
resolveAlias(uri) {
  return this.aliases[uri] ?? uri
}
```

**Implementation:**

- `resolveAlias(uri)` інтегрований в `resolve()` — автоматично застосовується перед побудовою шляху.
- Усі драйвери (`DBFS`, `db-browser`) отримують підтримку aliases через наслідування.

**Tasks:**

- [x] Додати `aliases` поле в конструктор `DB`.
- [x] Додати метод `resolveAlias(uri)` у `DB`.
- [x] Інтегрувати `resolveAlias()` у `resolve()` для наскрізної роботи.
- [x] Оновити JSDoc типи: `aliases?: Record<string, string>`.
- [x] Тест: `task.spec.js` — 3 кейси (constructor, resolve hit, resolve miss + інтеграція resolve).
