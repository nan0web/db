# 🏗️ Архітектура: @nan0web/db

> **Кожні дані стають базою даних.**

---

## 🧭 Фаза 1: Філософія та Абстракція (The Seed)

### Місія

`@nan0web/db` — це **ядро** екосистеми `nan0web`. Пакет реалізує ідею: будь-яке джерело даних (файлова система, браузер, Redis, MongoDB, Neo4j, HTTP API) стає єдиною **документною базою даних** через спільний інтерфейс URI-адресації.

Це не ORM. Це не query builder. Це **VFS-роутер** (Virtual File System Router), де:

- `cwd` — зовнішній контекст (хост або фізичний шлях)
- `root` — внутрішній корінь/точка монтування
- `pathname` — відносний шлях запиту

**Формула URI: `cwd + root + pathname`** — фундамент усієї системи.

### Ключові Принципи

1. **Агностичність** — базовий клас `DB` не знає про конкретні сховища. Кожне сховище — це драйвер.
2. **Наслідування документів** — глобальні змінні (`_/index.json`) каскадно поширюються на дочірні документи.
3. **Посилання ($ref)** — документи можуть посилатись на інші документи та їхні фрагменти.
4. **Розширення** — `$ref` на верхньому рівні документу розширює його даними з іншого документу.
5. **Data-Driven** — дані є джерелом правди, UI та логіка побудовані навколо них.

### Глосарій

| Термін             | Визначення                                                       |
| ------------------ | ---------------------------------------------------------------- |
| **DB**             | Базовий VFS-роутер, що працює з Map<string, any> в пам'яті       |
| **Driver**         | Реалізація конкретного сховища (DBFS, DBBrowser, DBRedis тощо)   |
| **Document**       | Одиниця даних, адресована через URI                              |
| **Directory**      | Ієрархічна одиниця групування, може мати глобальний документ `_` |
| **DirectoryIndex** | Метадані директорії (entries, stat, columns)                     |
| **DocumentStat**   | Метадані документу (size, mtimeMs, exists)                       |
| **DocumentEntry**  | Вхідна точка документу з метаданими                              |
| **StreamEntry**    | Подія прогресу при обході дерева                                 |
| **Data**           | Утиліти маніпуляції (flatten, unflatten, merge, clone)           |
| **AuthContext**    | Контекст автентифікації (role, roles, fails)                     |
| **FetchOptions**   | Опції розширеного завантаження (ref, inherit, extensions)        |
| **GetOptions**     | Опції базового завантаження (defaultValue)                       |
| **Mount**          | VFS-монтування — підключення підбази за URI-префіксом            |
| **Attach**         | Fallback-ланцюг — додавання резервної бази                       |
| **Model**          | Клас-схема для гідрації plain objects (Model-as-Schema)          |

---

## 📐 Фаза 2: Доменне Моделювання (Data-Driven Models)

### Структура `src/`

```
src/
├── DB/
│   ├── DB.js              # Головний клас (~68KB): VFS routing, mount, attach, fetch, get, set, model
│   ├── AuthContext.js      # Контекст авторизації (role, hasRole, fail)
│   ├── DriverProtocol.js   # Абстрактний протокол для драйверів
│   ├── ExtendedDB.js       # Мінімальне розширення для тестування
│   ├── FetchOptions.js     # Опції fetch() з підтримкою наслідування
│   ├── GetOptions.js       # Опції get() з defaultValue
│   ├── path.js             # URI-утиліти (normalize, basename, dirname, absolute, resolveSync, relative)
│   └── index.js            # Реекспорт DB + types
├── Data.js                 # Статичні утиліти: flatten, unflatten, merge, clone, refs
├── Directory.js            # Константи директорій (FILE='_', INDEX='index', DATA_EXTNAMES)
├── DirectoryIndex.js       # Індекс директорії (entries, stat, columns, формати)
├── DocumentEntry.js        # Метадані документу при лістингу
├── DocumentStat.js         # Стат файлу (size, mtimeMs, exists, isDirectory)
├── StreamEntry.js          # Прогрес-подія при обході
└── index.js                # Головний реекспорт
```

### Ключові API

#### VFS Router — `mount()` / `unmount()`

```js
const db = new DB()
db.mount('/media', s3Driver)
db.mount('/cache', redisDriver)
db.mount('/local', fsDriver)

await db.fetch('/media/logo.png') // → S3
await db.fetch('/cache/user_1') // → Redis
await db.fetch('/local/config') // → FileSystem
```

Longest-prefix matching: для URI `/local/deep/path` знайдеться монтування `/local`.

#### Fallback Chain — `attach()`

```js
const primary = new DBFS({ root: './data' })
const fallback = new DB({ predefined: [['defaults.json', { theme: 'dark' }]] })
primary.attach(fallback)

// Якщо документ не знайдено в primary, шукатиме у fallback
await primary.fetch('defaults') // → { theme: 'dark' }
```

#### Model Hydration — `model()`

```js
class ProductModel {
  static name = { default: '', help: 'Product name' }
  static price = { default: 0, type: 'number' }
  constructor(data) {
    Object.assign(this, data)
  }
}

db.model('/products', ProductModel)
await db.set('products/item.json', { name: 'Widget', price: 42 })
const product = await db.fetch('products/item')
// product instanceof ProductModel === true
```

#### Schema Validation — `validate()`

```js
const result = await db.validate('products/item', { price: 'not-a-number' })
// { valid: false, errors: [{ field: 'price', expected: 'number' }] }
```

#### Path Utilities — `@nan0web/db/path`

Окремий субмодуль (виставлений через `exports["./path"]`) з URI-утилітами:
`normalize`, `basename`, `dirname`, `extname`, `absolute`, `resolveSync`, `relative`, `isRemote`, `isAbsolute`.

### Драйвери (Розширення)

| Драйвер       | Пакет                 | Сховище                                           |
| ------------- | --------------------- | ------------------------------------------------- |
| **DBFS**      | `@nan0web/db-fs`      | Файлова система (YAML, JSON, Nano, CSV, Markdown) |
| **DBBrowser** | `@nan0web/db-browser` | IndexedDB + fetch() з кешуванням                  |
| **DBRedis**   | (планується)          | Redis з TTL                                       |
| **DBMongo**   | (планується)          | MongoDB з колекціями                              |
| **DBNeo4j**   | (планується)          | Neo4j (графові зв'язки)                           |

Усі драйвери наслідують `DBDriverProtocol`, який визначає контракт:
`loadDocument`, `saveDocument`, `dropDocument`, `writeDocument`, `moveDocument`, `statDocument`, `listDir`.

### Джерела даних

- **Map<string, any>** — in-memory (базовий DB)
- **predefined** — початкові дані через масив `[uri, data]` пар
- **YAML/JSON/Nano/CSV/Markdown** — через драйвер `@nan0web/db-fs`
- **HTTP/fetch** — через `@nan0web/db-browser`

---

## 🛠 Фаза 3: Верифікація Логіки (CLI-First)

### Тестування

Пакет покритий **453+ unit-тестами** (node:test + assert/strict):

| Файл                     | Фокус                                                                |
| ------------------------ | -------------------------------------------------------------------- |
| `DB.test.js`             | Основна логіка: connect, get, set, fetch, push, resolve, inheritance |
| `DB.mount.test.js`       | VFS монтування та роутинг                                            |
| `DB.fallback.test.js`    | Attach / fallback chain                                              |
| `DB.model.test.js`       | Model hydration + validation                                         |
| `DB.batch.test.js`       | getAll / setAll                                                      |
| `DB.watch.test.js`       | Watcher + change events                                              |
| `DB.list.test.js`        | listDir + DirectoryIndex                                             |
| `DB.path.test.js`        | Path utilities                                                       |
| `DB.auth.test.js`        | AuthContext integration                                              |
| `DB.dbs.test.js`         | DB.isDB() duck typing                                                |
| `DB.index.test.js`       | Index file handling                                                  |
| `CrossDriver.test.js`    | Cross-driver interop (db ↔ db-fs)                                    |
| `Data.test.js`           | flatten, unflatten, merge, clone                                     |
| `Directory.test.js`      | Directory constants + behavior                                       |
| `DirectoryIndex.test.js` | Index formats (rows, text, object, ref)                              |
| `DocumentEntry.test.js`  | Entry metadata                                                       |
| `DocumentStat.test.js`   | Stat contract                                                        |
| `StreamEntry.test.js`    | Progress events                                                      |
| `DriverProtocol.test.js` | Protocol compliance                                                  |
| `README.md.js`           | ProvenDoc (executable README)                                        |

#### Конвеєр тестування (package.json scripts)

```
test          → node --test "src/**/*.test.js"
test:docs     → node --test src/README.md.js
test:release  → node --test "releases/**/*.test.js"
test:all      → test + test:docs + build + knip + audit
```

### CLI Integration

Пакет має CLI-пісочницю (`npm run play`), яка через `@nan0web/ui-cli` дозволяє інтерактивно працювати з базою даних у терміналі.

---

## 🪐 Фаза 4: Sovereign Workbench (The Master IDE)

### Playground (`play/`)

Директорія `play/` містить інтерактивну пісочницю для експериментів з DB:

```bash
npm run play
# або
node play/main.js
```

Пісочниця дозволяє створювати, читати, модифікувати та видаляти документи через CLI інтерфейс.

### Інтеграція документації

- `README.md` — публічна документація API (ProvenDoc, генерується з тестів)
- `docs/uk/README.md` — українська версія README
- `docs/uk/project.md` — архітектурна документація (цей файл)

---

## 🎨 Фаза 5: Тематизація та Інтерфейс (Theming)

Ця фаза наразі **не реалізована** в пакеті `@nan0web/db`, оскільки це backend/core пакет без власного UI. Візуальна тематизація відбувається на рівні пакетів-споживачів (`@nan0web/ui-react`, `@nan0web/ui-lit`, `@nan0web/ui-cli`).

Пакет забезпечує Data-Driven підтримку для UI через:

- **Model-as-Schema** — декларативні метадані для автогенерації форм
- **validate()** — серверна валідація для UI
- **AuthContext** — контроль доступу для UI елементів

---

## 📊 Екосистемна Роль

```
@nan0web/db (цей пакет)
├── @nan0web/db-fs         — Файлова система
├── @nan0web/db-browser    — Браузер + IndexedDB
├── @nan0web/db-fetch      — HTTP fetch
└── (планується)
    ├── @nan0web/db-redis   — Redis
    ├── @nan0web/db-mongo   — MongoDB
    └── @nan0web/db-neo4j   — Neo4j
```

Залежності:

- **runtime**: `@nan0web/log` (логування)
- **peer**: `@nan0web/types` (JSDoc типи)
- **dev**: `@nan0web/db-fs`, `@nan0web/test`, `@nan0web/release`, `@nan0web/ui-cli`

---

## 🏁 Чек-ліст Готовності

- [x] Чітка місія: "Кожні дані стають базою даних"
- [x] Базова абстракція: VFS Router з mount/attach
- [x] Доменні моделі: Model-as-Schema з `validate()`
- [x] CLI: playground (`npm run play`)
- [ ] Sandbox: потребує інтеграції з `blocks-sandbox`
- [ ] Документація в Sandbox: потребує SSG генерації
- [x] Типізація: повна JSDoc + d.ts покриття
