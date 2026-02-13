# @nan0web/db

| [Статус](https://github.com/nan0web/monorepo/blob/main/system.md#написання-сценаріїв) | Документація                                                                                                                                        | Покриття тестами | Функції                            | Версія Npm |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------- | ---------- |
| 🟢 `99.2%`                                                                            | 🧪 [English 🏴󠁧󠁢󠁥󠁮󠁧󠁿](https://github.com/nan0web/db/blob/main/README.md)<br />[Українською 🇺🇦](https://github.com/nan0web/db/blob/main/docs/uk/README.md) | 🟢 `96.3%`       | ✅ d.ts 📜 system.md 🕹️ playground | 1.1.1      |

Агностична документна база даних та утиліти для маніпуляції даними. Розроблена як
гнучкий, мінімальний і потужний інструмент — що підтримує будь-який формат даних та
вкладену ієрархію з обробкою посилань, наслідування та глобальних змінних.

Натхненна правилом `zero-is-not-a-number` з nan0web:

> Кожні дані стають базою даних.

Базується на реальних випадках використання, підтримує:

- сплющування/розплющування об'єктів
- глибоке злиття з обробкою посилань
- асинхронне спискування каталогів (для fs & fetch шарів)
- прогрес на основі потоку під час обходу

Дивись як це працює в [пісочниці](#пісочниця).

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

Як завантажити JSON-документ?

```js
import DB from '@nan0web/db'
const db = new DB()
const doc = await db.loadDocumentAs('.json', 'doc', { key: 'value' })
console.info(doc) // ← { key: "value" }
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
const db = new DB({ data: new Map([['file.json', { value: 'loaded' }]]) })
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

### `db.push(uri?)`

Синхронізує зміни в пам'яті з зовнішніми файлами або службами.

Як синхронізувати зі сховищем?

```js
import DB from '@nan0web/db'
const db = new DB()
await db.set('./app.json', { version: '1.0' })
const changed = await db.push()
console.info(changed) // ← ["./app.json"]
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

### `Data.merge(a, b)`

Глибоке злиття двох об'єктів, обробляє конфлікти масивів шляхом заміни.

Як зливати об’єкти глибоко?

```js
import { Data } from '@nan0web/db'
const a = { x: { one: 1 }, arr: [0] }
const b = { y: 'two', x: { two: 2 }, arr: [1] }
const merged = Data.merge(a, b)
console.info(merged) // ← { x: { one: 1, two: 2 }, y: 'two', arr: [ 1 ] }
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

Витягує розширення файлу з крапкою (у нижньому регістрі).

Як витягти розширення?

```js
import { extname } from '@nan0web/db/path'
console.info(extname('file.TXT')) // ← .txt
console.info(extname('archive.tar.gz')) // ← .gz
console.info(extname('noext')) // ← ''
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

## Допомога у розвитку

Як брати участь? – [див. CONTRIBUTING.md](https://github.com/nan0web/db/blob/main/CONTRIBUTING.md)

## Ліцензія

ISC License – [див. повний текст](https://github.com/nan0web/db/blob/main/LICENSE)
