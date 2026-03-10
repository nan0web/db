import { it, describe } from 'node:test'
import assert from 'node:assert/strict'
import { DB, Data } from '../../../../../index.js'
import { DBFS } from '../../../../../../../db-fs/src/index.js'
import { NoConsole } from '@nan0web/log'

describe('Реліз v1.3.1: Контрактні тести', () => {
	describe('1. Інтеграція драйверів (DB + DBFS)', () => {
		it('повинен дозволяти монтування DBFS та успішно читати дані', async () => {
			const db = new DB({ console: new NoConsole() })
			const fsDb = new DBFS({
				cwd: '.',
				root: 'test/fixtures', // Припустимо, що така тека існує або мИ її створимо
				console: new NoConsole(),
			})

			db.mount('/fs', fsDb)

			// Цей тест має впасти, якщо монтування або роутинг не працює
			// Або якщо тека fixtures порожня
			const res = await db.stat('/fs')
			assert.ok(res, 'Стат змонтованої бази має бути успішним')
		})

		it('повинен виконувати наскрізний get через змонтований драйвер', async () => {
			const db = new DB({ console: new NoConsole() })
			const fsDb = new DBFS({
				cwd: '.',
				root: '.',
				console: new NoConsole(),
			})
			db.mount('/local', fsDb)

			// Спробуємо прочитати package.json через віртуальний шлях
			const pkg = await db.get('/local/package.json')
			assert.equal(pkg.name, '@nan0web/db', 'Дані мають бути прочитані через DBFS')
		})
	})

	describe('2. Циклічні посилання (Data stability)', () => {
		it('Data.merge не повинен падати при наявності циклічних посилань', () => {
			const a = { name: 'A' }
			const b = { name: 'B', parent: a }
			a.child = b

			const target = { data: {} }
			const source = { data: a }

			// Цей тест ПОВИНЕН ВПАСТИ (RangeError: Maximum call stack size exceeded)
			// через JSON.parse(JSON.stringify(target)) у Data.js:263
			assert.doesNotThrow(() => {
				Data.merge(target, source)
			}, 'Data.merge має безпечно обробляти цикли')
		})

		it('Data.flatten не повинен падати при наявності циклічних посилань', () => {
			const a = { name: 'A' }
			a.self = a

			// Цей тест ПОВИНЕН ВПАСТИ
			assert.doesNotThrow(() => {
				Data.flatten(a)
			}, 'Data.flatten має безпечно обробляти цикли')
		})
	})

	describe('3. Глибоке успадкування моделей', () => {
		it('повинен коректно гідрувати дані через ланцюг успадкування моделей', async () => {
			class Base {
				static type = { default: 'base' }
				constructor(data) {
					Object.assign(this, data)
				}
			}
			class Level1 extends Base {
				static level = { default: 1 }
			}
			class Level2 extends Level1 {
				static sub = { default: true }
			}

			const db = new DB({ console: new NoConsole() })
			db.model('/deep', Level2)

			// Створюємо дані через офіційний інтерфейс
			await db.set('deep/item.json', { name: 'test' })

			const item = await db.fetch('deep/item')

			assert.ok(item, 'Fetch має повернути дані')
			assert.ok(item instanceof Level2, 'Має бути екземпляром Level2')
			assert.ok(item instanceof Base, 'Має бути екземпляром Base')

			// Перевірка валідації по всій глибині
			const validation = await db.validate('deep/item', { name: 'test', level: 'wrong' })
			assert.equal(validation.valid, false, 'Валідація має знайти помилку в успадкованому полі')
		})
	})
})
