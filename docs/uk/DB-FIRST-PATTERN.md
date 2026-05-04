# DB-First Architecture Pattern

## Description
Цей паттерн встановлює стандарт взаємодії доменної логіки з оточенням виключно через інтерфейс `DB`.
Це дозволяє досягти повної ізоляції логіки (Total Logic Isolation) та крос-платформеності.

## Ключові правила
1. **Zero System Imports**: Заборонено використовувати `node:fs`, `node:path`, `node:os` у доменних моделях.
2. **Context via DB**: Усі операції зі шляхами виконуються через екземпляр `db`.
3. **Standard Aliases**:
   - `~` — точка входу в конфігурацію додатка (`$HOME/.nan0web/`).
   - `store` — аліас для глобального реєстру (`~/store/`).

## Приклади використання
### Робота зі шляхами (Path Resolving)
Замість `path.join` використовуйте `db.resolve()`.

How to resolve paths without node:path?
```js
import DB from '@nan0web/db'
const db = new DB({ root: '/workspace' })
const home = new DB({ root: './.nan0web', cwd: '/home/user' })
db.mount('~', home)
const storePath = db.resolveSync('~/store/registry.csv')
console.info(storePath) // ~/store/registry.csv
console.info(db.location(storePath)) // /home/user/.nan0web/store/registry.csv
```
### Нормалізація шляхів (Normalization)
Використовуйте `db.relative()` для перетворення абсолютних шляхів у відносні щодо робочого простору.

How to normalize absolute paths to workspace-relative?
```js
import DB from '@nan0web/db'
const workspaceRoot = '/Users/i/src/project'
const db = new DB({ root: workspaceRoot })
const absPath = '/Users/i/src/project/packages/core/src/index.js'
const relPath = db.relative(absPath)
console.info(relPath) // packages/core/src/index.js
```
### Завантаження документів (Loading Documents)
Використовуйте `db.loadDocumentAs()` для роботи з типізованими даними.

How to load CSV from store via alias?
```js
import DB from '@nan0web/db'
const storeData = [{ name: 'ui', path: '/workspace/packages/ui' }]
const home = new DB({
	root: './.nan0web',
	cwd: '/home/user',
	predefined: [['store/test.csv', storeData]],
})
await home.connect()
const db = new DB({ root: '/workspace' })
db.mount('~', home)
const data = await db.loadDocument('~/store/test.csv')
console.info(data[0].name) // ui
```