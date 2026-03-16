import { it, describe } from 'node:test'
import assert from 'node:assert/strict'
import { Data, DB } from '../../../../../index.js'

describe('Реліз v1.4.2: Збереження літеральних слешів у ключах', () => {
	describe('1. Data.flatten() — екранує літеральні розділювачі в ключах', () => {
		it('зберігає ключі що містять "/" у плоскому виводі', () => {
			const obj = { 'Manage / Update': 'value' }
			const flat = Data.flatten(obj)

			const keys = Object.keys(flat)
			assert.equal(keys.length, 1, 'Повинен створити рівно один плоский ключ')
			assert.equal(flat[keys[0]], 'value')
		})

		it('не екранує "/" що використовується як реальний розділювач шляху', () => {
			const obj = { a: { b: 1 } }
			const flat = Data.flatten(obj)
			assert.deepEqual(flat, { 'a/b': 1 })
		})
	})

	describe('2. Data.unflatten() — roundtrip з літеральними розділювачами', () => {
		it('roundtrip: flatten → unflatten зберігає ключі з "/"', () => {
			const original = { 'Manage / Update Agent Workflows': 'переклад' }
			const roundtripped = Data.unflatten(Data.flatten(original))
			assert.deepEqual(roundtripped, original)
		})

		it('roundtrip: змішані звичайні та слеш-ключі', () => {
			const original = {
				title: 'Hello',
				'Manage / Update': 'Керування',
				nested: { deep: 'value' },
				'Input / Output': 'I/O',
			}
			const roundtripped = Data.unflatten(Data.flatten(original))
			assert.deepEqual(roundtripped, original)
		})

		it('roundtrip: глибоко вкладений обʼєкт зі слеш-ключами на рівні листя', () => {
			const original = {
				menu: {
					'File / Open': 'Відкрити',
					'File / Save': 'Зберегти',
					normal: 'звичайний',
				},
			}
			const roundtripped = Data.unflatten(Data.flatten(original))
			assert.deepEqual(roundtripped, original)
		})
	})

	describe('3. Data.find() — знаходить значення за ключами з "/"', () => {
		it('знаходить ключ верхнього рівня з "/" через масивний шлях', () => {
			const obj = { 'Manage / Update': 'value' }
			const result = Data.find(['Manage / Update'], obj)
			assert.equal(result, 'value')
		})

		it('знаходить вкладений ключ з "/" через масивний шлях', () => {
			const obj = { menu: { 'File / Open': 'Відкрити' } }
			const result = Data.find(['menu', 'File / Open'], obj)
			assert.equal(result, 'Відкрити')
		})

		it('знаходить вкладений ключ з "/" через батьківський рядковий шлях', () => {
			const obj = { menu: { 'File / Open': 'Відкрити' } }
			const result = Data.find('menu', obj)
			assert.equal(result['File / Open'], 'Відкрити')
		})
	})

	describe('4. DB.resolveReferences() — fetch зберігає слеш-ключі', () => {
		it('resolveReferences roundtrip не розбиває слеш-ключі', async () => {
			const db = new DB({ connected: true })
			const data = {
				'Manage / Update': 'Керування',
				normal: 'звичайний',
			}
			const result = await db.resolveReferences(data)
			assert.deepEqual(result, data)
		})
	})

	describe('5. Зворотна сумісність — існуюча поведінка збережена', () => {
		it('стандартні вкладені обʼєкти коректно сплющуються та розплющуються', () => {
			const original = { a: { b: { c: 1 } } }
			assert.deepEqual(Data.unflatten(Data.flatten(original)), original)
		})

		it('масиви коректно сплющуються та розплющуються', () => {
			const original = { items: [1, 2, 3] }
			assert.deepEqual(Data.unflatten(Data.flatten(original)), original)
		})

		it('порожні обʼєкти та масиви зберігаються', () => {
			const original = { empty: {}, arr: [] }
			assert.deepEqual(Data.unflatten(Data.flatten(original)), original)
		})
	})
})
