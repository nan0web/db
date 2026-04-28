---
version: 1.5.2
type: bugfix
status: completed
locale: uk
models: []
---

[English version](./task.en.md)

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
Виправлення критичної помилки, коли метод `absolute()` примусово додає початковий слеш, що ламає релятивне монтування у драйверах файлової системи (DBFS).

## 👥 User Stories
> Як розробник, я хочу використовувати релятивні шляхи для `root` у DBFS (наприклад, `public/data`), щоб база даних розгорталася відносно поточної робочої директорії, а не намагалася створити папки в корені диска `/`.

## 🏗 Data-Driven Architecture
- Оновлення \`DB/path.js\`: додання можливості отримувати шлях без віртуального префікса \`/\`.

## 🎯 Scope
- [ ] Створити тест, що підтверджує "захоплення" шляху початковим слешем у \`DB.absolute()\`.
- [ ] Реалізувати механізм отримання чистого релятивного шляху.

## ✅ Acceptance Criteria (DoD)
- [ ] Контрактні тести (\`task.spec.js\`) проходять (Green).
- [ ] \`DB.absolute()\` не перетворює релятивні наміри на системні абсолюти без потреби.
