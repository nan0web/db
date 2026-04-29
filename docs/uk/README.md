# @nan0web/db

<!-- %PACKAGE_STATUS% -->

Агностична документна база даних та утиліти для маніпуляції даними. Розроблена як
гнучкий, мінімальний і потужний інструмент — що підтримує будь-який формат даних та
вкладену ієрархію з обробкою посилань, наслідування та глобальних змінних.

Натхненна правилом `zero-is-not-a-number` з nan0web:

> Кожні дані стають базою даних.

Базується на реальних випадках використання, підтримує:
- **VFS-маршрутизація** — `mount()` обʼєднує різні сховища в одне дерево. Підтримує **Root Mount** (порожній префікс `''`) для прозорого перехоплення всіх відносних шляхів.
- **Ланцюг fallback** — `attach()` забезпечує резервне копіювання з прозорими повідомленнями
- **Гідрація моделей** — автоматичне перетворення простих обʼєктів у типізовані моделі
- офіційно зареєстровано **.nan0** як нативне розширення даних
- сплющування/розплющування об'єктів (зі збереженням літеральних слешів)
- глибоке злиття з обробкою посилань
- асинхронне спискування каталогів (для fs & fetch шарів)
- прогрес на основі потоку під час обходу

Дивись як це працює в [пісочниці](#пісочниця).

## Архітектура

`DB` — це VFS-маршрутизатор. Монтуй різні сховища, приєднуй fallback, гідруй моделі:

```
[App] → db.fetch('/media/logo.png')  → [S3 Driver]
        db.fetch('/cache/user_1')    → [Redis Driver]
        db.fetch('/play/demo-app')   → [FS Driver] → Document instance
```

## Встановлення

Як встановити за допомогою npm?

```bash
npm install @nan0web/db
```

Як встановити за допомогою pnpm?

```bash
pnpm add @nan0web/db
```

Як встановити за допомогою yarn?

```bash
yarn add @nan0web/db
```

## Швидкий старт

### Приклад: Підтримка кореневого монтування

Ви можете монтувати базу даних з порожнім префіксом (`''`). Цей екземпляр буде перехоплювати всі відносні шляхи, які не відповідають більш специфічним точкам монтування. Це надзвичайно корисно для ізольованих середовищ (Playground).

Як змонтувати базу даних як віртуальний корінь?

```js
import DB from '@nan0web/db'
const rootDB = new DB()
const targetDB = new DB({ data: new Map([['doc.json', { ok: true }]]) })
rootDB.mount('', targetDB)

// Доступ до відносного шляху прозоро перенаправляється до targetDB
```

### Нативне розширення даних `.nan0`

Починаючи з `v1.4.4`, формат `.nan0` є повноправним громадянином поряд із `.json`. Він автоматично розпізнається як файл, що містить дані.

Як використовувати нативне розширення даних .nan0?

```js
import DB from '@nan0web/db'
const db = new DB({ data: new Map([['vault.nan0', { secret: 42 }]]) })
const result = await db.get('vault.nan0')
console.info(result) // ← { secret: 42 }
```

## JSON та Дані

Як завантажити документ з даними?

```js
import DB from '@nan0web/db'
const db = new DB()
const doc = await db.loadDocumentAs('.json', 'doc', { key: 'value' })
console.info(doc) // ← { key: "value" }
```

### Потокове читання рядок за рядком

Формати `.jsonl`, `.csv` та `.csv0` безпечно здійснюють потокове читання рядок за рядком, нативно обробляючи фрагментацію чанків через стандартний протокол драйвера (Driver Protocol).

Як читати потокові рядки з файлів даних?

```js
import DB, { DBDriverProtocol } from '@nan0web/db'

// Приклад реалізації драйвера
class MockDriver extends DBDriverProtocol {
	async stream(uri) {
		return (async function* () {
			yield '{"uid":1}'
			yield '{"uid":2}'
			yield '{"uid":3}'
		})()
	}
}

// Прикріпіть свій власний або імпортований драйвер
const db = new DB({ driver: new MockDriver() })

const stream = await db.stream('demo.jsonl')
const lines = []
for await (const line of stream) {
	lines.push(line)
}

console.info(lines.length) // ← 3
console.info(lines) // ← [ '{"uid":1}', '{"uid":2}', '{"uid":3}' ]
```

### Приклад: Використання `get()` з значенням за замовчуванням

Як отримати або повернути значення за замовчуванням?

```js
import DB from '@nan0web/db'
const db = new DB()
const result = await db.get('missing-file.json', { defaultValue: {} })
console.info(result) // ← {}
```

### Приклад: Завантаження конкретного документу

Як отримати конкретний документ?

```js
import DB from '@nan0web/db'
const db = new DB({ data: new Map([['file.txt', 'text']]) })
const result = await db.get('file.txt')
console.info(result) // ← "text"
```

## Використання з реальним контекстом

### Обробка посилань та глобальних змінних

Як використовувати систему посилань документів?

```js
import DB from '@nan0web/db'
const db = new DB({
  data: new Map([
    ['_/index.json', { global: 'value' }],
    ['data.json', { $ref: '_/index.json', key: 'val' }],
  ]),
})
await db.connect()
const res = await db.fetch('data.json')
console.info(res) // ← { global: "value", key: "val" }
```

## Пісочниця

CLI-пісочниця для безпечних експериментів:

```bash
git clone https://github.com/nan0web/db.git
cd db
npm install
npm run play
```

## Посилання API

Основою пакету є базові інструменти управління ієрархічними структурами даних.

### `db.get(uri, GetOpts)`

Завантажує/повертає вміст документу з його URI.

- **Параметри**
  - `uri` _(string)_ – URI документу.
  - `GetOpts.defaultValue` _(any)_ – значення за замовчуванням, якщо документ не знайдено.

- **Повертає**
  - _(any)_ – Вміст документу або значення за замовчуванням.

Як отримати значення документу?

```js
import DB from '@nan0web/db'
const db = new DB({ data: new Map([['x.file', 'hello']]) })
const result = await db.get('x.file')
console.info(result) // ← "hello"
```

### `db.fetch(uri, FetchOptions)`

Як get, але з додатковими можливостями: обробка посилань, змінних, правил наслідування.

Підтримує пошук розширень, наприклад, знаходить `.json`, навіть якщо воно пропущене.

Як завантажити розширені дані?

```js
import DB from '@nan0web/db'
const db = new DB({ predefined: [['file.json', { value: 'loaded' }]] })
await db.connect()
const result = await db.fetch('file')
console.info(result) // ← { value: "loaded" }
```

### `db.set(uri, data)`

Зберігає вміст документу і відмічає оновлення метаданих.

Як зберегти новий вміст?

```js
import DB from '@nan0web/db'
const db = new DB()
const res = await db.set('file.text', 'save me!')
console.info(res) // ← "save me!"
console.info(db.data.get('file.text')) // ← "save me!"
```

### `Data.flatten(data)`

Згладжує вкладений об'єкт до шляхів як ключів.

Як згладити об'єкт?

```js
import { Data } from '@nan0web/db'
const flat = Data.flatten({ x: { a: [1, 2, { b: 3 }] } })
console.info(flat) // ← { 'x/a/[0]': 1, 'x/a/[1]': 2, 'x/a/[2]/b': 3 }
```

### `Data.unflatten(data)`

Відновлює вкладену структуру з плоских ключів.

Як відновити структуру даних?

```js
import { Data } from '@nan0web/db'
const nested = Data.unflatten({
  'x/y/z': 7,
  'arr/[0]/title': 'перший',
  'arr/[1]/title': 'другий',
})
console.info(nested) // ← { x: { y: { z: 7 } }, arr: [ { title: 'перший' }, { title: 'другий' } ] }
```

### Збереження літеральних слешів

Починаючи з `v1.4.2`, ключі, що містять `OBJECT_DIVIDER` (за замовчуванням `/`), автоматично екрануються під час сплющування та відновлюються під час розплющування. Це гарантує, що ключі i18n, такі як `"Manage / Update"`, не будуть помилково розділені на вкладені об'єкти.

Як зберегти літеральні слеші в ключах?

```js
import { Data } from '@nan0web/db'
const obj = { 'Manage / Update': 'Керування' }
const flat = Data.flatten(obj)

// Слеш екранується символом Unicode FRACTION SLASH '∕'
console.info(Object.keys(flat)[0]) // ← "Manage ∕ Update"

const unflat = Data.unflatten(flat)
console.info(unflat['Manage / Update']) // ← "Керування"
```

### `Data.merge(a, b)`

Глибоке злиття двох об'єктів, обробляє конфлікти масивів шляхом заміни.

Як зливати об'єкти глибоко?

```js
import { Data } from '@nan0web/db'
const a = { x: { one: 1 }, arr: [0] }
const b = { y: 'two', x: { two: 2 }, arr: [1] }
const merged = Data.merge(a, b)
console.info(merged) // ← { x: { one: 1, two: 2 }, y: 'two', arr: [ 1 ] }
```

### `Data.find(path, data)`

Знаходить значення за рядковим або масивним шляхом. Використовуйте масивний шлях для доступу до ключів, що містять `/`.

Як знайти значення за шляхом?

```js
import { Data } from '@nan0web/db'
const data = { 'I/O': 'значення', nested: { item: 1 } }
console.info(Data.find('nested/item', data)) // ← 1
console.info(Data.find(['I/O'], data)) // ← "значення"
```

## Шляхові утиліти

`@nan0web/db/path` надає функції вирішення URI/шляхів для використання на різних платформах.
Підтримує нормалізацію, отримання basename/dirname та вирішення абсолютних/відносних шляхів.

### Імпорт шляхових утиліт

Як імпортувати шляхові утиліти?

```js
import { normalize, basename, dirname, absolute, resolveSync } from '@nan0web/db/path'
console.info(normalize('a/b/../c')) // ← a/c
console.info(basename('path/to/file.txt')) // ← file.txt
console.info(dirname('path/to/file.txt')) // ← path/to/
console.info(absolute('/base', 'root', 'file')) // ← /base/root/file
console.info(resolveSync('/base', '.', 'file.txt')) // ← file.txt
```

### `normalize(...segments)`

Нормалізує сегменти шляху, обробляє `../`, `./` та дубльовані слеші.

Як нормалізувати сегменти шляху?

```js
import { normalize } from '@nan0web/db/path'
console.info(normalize('a/b/../c')) // ← a/c
console.info(normalize('a//b///c')) // ← a/b/c
console.info(normalize('dir/sub/')) // ← dir/sub/
```

### `basename(uri, [suffix])`

Витягує базове ім'я, при бажанні видаляє суфікс або розширення.

Як витягти базове ім'я?

```js
import { basename } from '@nan0web/db/path'
console.info(basename('/dir/file.txt')) // ← file.txt
console.info(basename('/dir/file.txt', '.txt')) // ← file
console.info(basename('/dir/file.txt', true)) // ← file (видалити розширення)
console.info(basename('/dir/')) // ← dir/
```

### `dirname(uri)`

Витягує шлях батьківського каталогу.

Як витягти шлях каталогу?

```js
import { dirname } from '@nan0web/db/path'
console.info(dirname('/a/b/file')) // ← /a/b/
console.info(dirname('/a/b/')) // ← /a/
console.info(dirname('/file')) // ← /
console.info(dirname('file.txt')) // ← .
```

### `extname(uri)`

Витягує розширення файлу з крапкою (у нижньому регістрі). Починаючи з `v1.5.3`, правильно ігнорує крапки в назвах каталогів абсолютних шляхів.

Як витягти розширення?

```js
import { extname } from '@nan0web/db/path'
console.info(extname('file.TXT')) // ← .txt
console.info(extname('/Users/user/src/nan.web/apps/t.json')) // ← .json
console.info(extname('.gitignore')) // ← ''
console.info(extname('/dir/')) // ← ''
```

### `resolveSync(cwd, root, ...segments)`

Вирішує сегменти відносно cwd/root (синхронно).

Як вирішити шлях синхронно?

```js
import { resolveSync } from '@nan0web/db/path'
console.info(resolveSync('/base', '.', 'a/b/../c')) // ← a/c
```

### `relative(from, to)`

Обчислює відносний шлях від `from` до `to`.

Як обчислити відносний шлях?

```js
import { relative } from '@nan0web/db/path'
console.info(relative('/a/b', '/a/c')) // ← c
console.info(relative('/root/dir', '/root/')) // ← dir
```

### `absolute(cwd, root, ...segments)`

Будує абсолютний шлях/URL з cwd, root та сегментів.

Як створити абсолютний шлях?

```js
import { absolute } from '@nan0web/db/path'
console.info(absolute('/base', 'root', 'file')) // ← /base/root/file
console.info(absolute('https://ex.com', 'api', 'v1')) // ← https://ex.com/api/v1
```

### `isRemote(uri)` & `isAbsolute(uri)`

Перевіряє, чи URI є віддаленим або абсолютним.

Як перевірити тип URI?

```js
import { isRemote, isAbsolute } from '@nan0web/db/path'
console.info(isRemote('https://ex.com')) // ← true
console.info(isAbsolute('/abs/path')) // ← true
console.info(isAbsolute('./rel')) // ← false
```

## Java•Script типи та автодоповнення

Пакет повністю типізований за допомогою JSDoc та d.ts.

## Драйвери та розширення

Драйвери розширюють DB бекендами сховищ. Наслідуйте `DBDriverProtocol` для власної логіки.

### Базове розширення драйвера

Як розширити DBDriverProtocol?

```js
import { DBDriverProtocol } from '@nan0web/db'
class MyDriver extends DBDriverProtocol {
  async read(uri) {
    // Власна логіка читання
    return { data: 'з власного сховища' }
  }
}
const driver = new MyDriver()
console.log(await driver.read('/шлях')) // ← { data: 'з власного сховища' }
```

### Використання драйвера в DB

Як приєднати драйвер до DB?

```js
import { DB, DBDriverProtocol } from '@nan0web/db'
class SimpleDriver extends DBDriverProtocol {
  async read(uri) {
    return `Прочитано: ${uri}`
  }
  async write(uri, data) {
    return true
  }
}
class ExtendedDB extends DB {
  constructor() {
    super({ driver: new SimpleDriver() })
    this.loadDocument = async (uri) => await this.driver.read(uri)
    this.saveDocument = async (uri, data) => await this.driver.write(uri, data)
  }
}
const db = new ExtendedDB()
await db.connect()
console.info(await db.get('/тест')) // ← Прочитано: тест
```

## Аутентифікація та авторизація

Використовуйте `AuthContext` для керування доступом на основі ролей під час операцій з DB.

### Базове використання AuthContext

Як створити AuthContext?

```js
import { AuthContext } from '@nan0web/db'
const ctx = new AuthContext({ role: 'user', roles: ['user', 'guest'] })
console.info(ctx.hasRole('user')) // ← true
console.info(ctx.role) // ← user
```

### AuthContext з доступом до DB

Як використовувати AuthContext в DB?

```js
import { DB, AuthContext } from '@nan0web/db'
const db = new DB()
const ctx = new AuthContext({ role: 'admin' })
await db.set('secure/file.txt', 'secret', ctx)
console.info(await db.get('secure/file.txt', {}, ctx)) // ← secret
```

### Обробка невдалих спроб доступу

Як обробити відмову в доступі?

```js
import { AuthContext } from '@nan0web/db'
const ctx = new AuthContext()
ctx.fail(new Error('Доступ заборонено'))
console.info(ctx.fails) // ← [Error: Доступ заборонено]
console.info(ctx.hasRole('admin')) // ← false
```

## Безпека VFS

Після монтування всіх баз даних, `seal()` блокує реєстр монтувань.
Будь-які подальші виклики `mount()` або `unmount()` кинуть помилку.
Це запобігає перехопленню точок монтування ненадійними плагінами під час роботи.

### Запечатування реєстру монтувань

Як запечатати реєстр монтувань?

```js
import DB from '@nan0web/db'
const db = new DB()
const cache = new DB()
db.mount('cache', cache)
db.seal()
console.info(db.sealed) // ← true
```

### Контракт помилок для зарезервованих префіксів

URI, що починаються з `~` або `@`, зарезервовані для точок монтування.
Якщо до них звертаються до монтування, DB кидає чітку помилку з підказкою:

```js
import DB from '@nan0web/db'
const db = new DB()
db._findMount('~/zones')
// → Error: Mount point "~" not found for URI "~/zones".
//   Did you forget to call db.mount('~', targetDb)?
```

## Доменні моделі

`DBConfig` та `RevisionInfo` надають стандартні визначення даних.

### `DBConfig`

Як безпечно серіалізувати аргументи підключення?

```js
import { DBConfig } from '@nan0web/db'
const config = new DBConfig('redis://yaro:pass123@redis.local:6379/cache')
console.info(config.protocol) // ← redis
console.info(config.safeDsn) // ← redis://yaro:***@redis.local:6379/cache
```

### `RevisionInfo`

Як стандартизувати історію документа?

```js
import { RevisionInfo } from '@nan0web/db'
const ts = new Date('2026-04-06T00:00:00Z').toISOString()
const rev = new RevisionInfo({ sha: '1234567890abcdef', timestamp: ts })
console.info(rev.shortSha) // ← 1234567
```

### `Directory.isConfig(path)`

Перевіряє, чи шлях представляє конфігураційний файл каталогу (`_.yaml`, `_.nan0`, `_.json`).

Як виявити конфігураційний файл каталогу?

```js
import { Directory } from '@nan0web/db'
console.info(Directory.isConfig('_.yaml')) // ← true
console.info(Directory.isConfig('path/to/_.nan0')) // ← true
console.info(Directory.isConfig('file.json')) // ← false
```

## Допомога у розвитку

Як брати участь? – [див. CONTRIBUTING.md](https://github.com/nan0web/db/blob/main/CONTRIBUTING.md)

## Ліцензія

ISC License – [див. повний текст](https://github.com/nan0web/db/blob/main/LICENSE)
