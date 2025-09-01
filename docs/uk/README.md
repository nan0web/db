# @nan0web/db

|[Статус](https://github.com/nan0web/monorepo/blob/main/system.md#написання-сценаріїв)|Документація|Покриття тестами|Функції|Версія Npm|
|---|---|---|---|---|
 |🟢 `98.4%` |🧪 [Англійською 🏴󠁧󠁢󠁥󠁮󠁧󠁿](https://github.com/nan0web/db/blob/main/README.md)<br />[Українською 🇺🇦](https://github.com/nan0web/db/blob/main/docs/uk/README.md) |🟢 `91.8%` |✅ d.ts 📜 system.md 🕹️ playground |— |

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

Дивись як це працює в [песочниці](#песочниця).

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
import DB from "@nan0web/db"
const db = new DB()
const doc = await db.loadDocumentAs(".json", "doc", { key: "value" })
console.info(doc) // ← { key: "value" }
```
### Приклад: Використання `get()` з значенням за замовчуванням

Як отримати або повернути значення за замовчуванням?
```js
import DB from "@nan0web/db"
const db = new DB()
const result = await db.get("missing-file.json", { defaultValue: {} })
console.info(result) // ← {}
```
### Приклад: Завантаження конкретного документу

Як отримати конкретний документ?
```js
import DB from "@nan0web/db"
const db = new DB({ data: new Map([["file.txt", "text"]]) })
const result = await db.get("file.txt")
console.info(result) // ← "text"
```
## Використання з реальним контекстом

### Обробка посилань та глобальних змінних

Як використовувати систему посилань документів?
```js
import DB from "@nan0web/db"
const db = new DB({
	data: new Map([
		["_/index.json", { global: "value" }],
		["data.json", { "$ref": "_/index.json", key: "val" }]
	])
})
const res = await db.fetch("data.json")
console.info(res) // ← { global: "value", key: "val" }
```
## Песочниця

CLI-песочниця для безпечних експериментів:
```bash
git clone https://github.com/nan0web/db.git
cd db
npm install
npm run playground
```

## Посилання API

Основою пакету є базові інструменти управління ієрархічними структурами даних.

### `db.get(uri, GetOpts)`
Завантажує/повертає вміст документу з його URI.

* **Параметри**
  * `uri` *(string)* – URI документу.
  * `GetOpts.defaultValue` *(any)* – значення за замовчуванням, якщо документ не знайдено.

* **Повертає**
  * *(any)* – Вміст документу або значення за замовчуванням.

Як отримати значення документу?
```js
import DB from "@nan0web/db"
const db = new DB({ data: new Map([["x.file", "hello"]]) })
const result = await db.get("x.file")
console.info(result) // ← "hello"
```
### `db.fetch(uri, FetchOptions)`
Як get, але з додатковими можливостями: обробка посилань, змінних, правил наслідування.

Підтримує пошук розширень, наприклад, знаходить `.json`, навіть якщо воно пропущене.

Як завантажити розширені дані?
```js
import DB from "@nan0web/db"
const db = new DB({ data: new Map([["file.json", { value: "loaded" }]]) })
const result = await db.fetch("file")
console.info(result) // ← { value: "loaded" }
```
### `db.set(uri, data)`
Зберігає вміст документу і відмічає оновлення метаданих.

Як зберегти новий вміст?
```js
import DB from "@nan0web/db"
const db = new DB()
const res = await db.set("file.text", "save me!")
console.info(res) // ← "save me!"
console.info(db.data.get("file.text")) // ← "save me!"
```
### `db.push(uri?)`
Синхронізує зміни в пам'яті з зовнішніми файлами або службами.

Як синхронізувати зі сховищем?
```js
import DB from "@nan0web/db"
const db = new DB()
await db.set("./app.json", { version: "1.0" })
const changed = await db.push()
console.info(changed) // ← ["./app.json"]
```
### `Data.flatten(data)`
Згладжує вкладений об'єкт до шляхів як ключів.

Як згладити об'єкт?
```js
import { Data } from "@nan0web/db"
const flat = Data.flatten({ x: { a: [1, 2, { b: 3 }] }})
console.info(flat) // ← { 'x/a/[0]': 1, 'x/a/[1]': 2, 'x/a/[2]/b': 3 }
```
### `Data.unflatten(data)`
Відновлює вкладену структуру з плоских ключів.

Як відновити структуру даних?
```js
import { Data } from "@nan0web/db"
const nested = Data.unflatten({
	"x/y/z": 7,
	"arr/[0]/title": "перший",
	"arr/[1]/title": "другий"
})
console.info(nested) // ← { x: { y: { z: 7 } }, arr: [ { title: 'перший' }, { title: 'другий' } ] }
```
### `Data.merge(a, b)`
Глибоке злиття двох об'єктів, обробляє конфлікти масивів шляхом заміни.

Як зливати об’єкти глибоко?
```js
import { Data } from "@nan0web/db"
const a = { x: { one: 1 }, arr: [0] }
const b = { y: "two", x: { two: 2 }, arr: [1] }
const merged = Data.merge(a, b)
console.info(merged) // ← { x: { one: 1, two: 2 }, y: 'two', arr: [ 1 ] }
```
## Типи Java•Script та автозаповнення
Пакет повністю типізовано з jsdoc і d.ts.

Скільки файлів d.ts має покривати джерело?

## Допомога у розвитку

Як брати участь? – [див. CONTRIBUTING.md](https://github.com/nan0web/db/blob/main/CONTRIBUTING.md)

## Ліцензія

ISC License – [див. повний текст](https://github.com/nan0web/db/blob/main/LICENSE)
