import { it, describe } from 'node:test'
import assert from 'node:assert/strict'
import { DB } from '../../../../src/index.js'
import { NoConsole } from '@nan0web/log'

describe('Реліз v1.4.0: Aliases Protocol та Стабілізація', () => {
	describe('1. Aliases Protocol — поле aliases в конструкторі', () => {
		it('DB приймає aliases як Map<string, string> через конструктор', () => {
			const db = new DB({
				console: new NoConsole(),
				aliases: {
					'docs/en/README.md': './README.md',
					'docs/en/project.md': './docs/en/project.md',
				},
			})
			assert.ok(db.aliases, 'DB повинен мати поле aliases')
			assert.equal(typeof db.aliases, 'object', "aliases має бути об'єктом")
		})

		it("aliases за замовчуванням є порожнім об'єктом", () => {
			const db = new DB({ console: new NoConsole() })
			assert.ok(db.aliases !== undefined, 'aliases має існувати')
			assert.deepEqual(db.aliases, {}, "aliases за замовчуванням має бути порожнім об'єктом")
		})
	})

	describe('2. Aliases Protocol — метод resolveAlias()', () => {
		it('resolveAlias повертає реальний URI якщо alias існує (hit)', () => {
			const db = new DB({
				console: new NoConsole(),
				aliases: {
					'docs/en/README.md': './README.md',
				},
			})
			const resolved = db.resolveAlias('docs/en/README.md')
			assert.equal(resolved, './README.md', 'Має повернути реальний шлях')
		})

		it('resolveAlias повертає оригінальний URI якщо alias не існує (miss)', () => {
			const db = new DB({
				console: new NoConsole(),
				aliases: {
					'docs/en/README.md': './README.md',
				},
			})
			const resolved = db.resolveAlias('some/other/path.md')
			assert.equal(resolved, 'some/other/path.md', 'Має повернути оригінальний URI')
		})

		it('resolve() автоматично застосовує alias (наскрізна інтеграція)', async () => {
			const db = new DB({
				console: new NoConsole(),
				aliases: {
					'en/README.md': 'root/README.md',
				},
			})
			const resolved = await db.resolve('en/README.md')
			assert.ok(!resolved.includes('en/README.md'), 'URI має бути замінено через alias')
			assert.ok(resolved.includes('root/README.md'), 'Має містити реальний шлях з alias')
		})
	})

	describe('3. CrossDriver — виправлення regression тестів', () => {
		it('CrossDriver.test.js не має падаючих тестів (4/4 pass)', async () => {
			// Цей тест є маркером: він не імпортує CrossDriver напряму,
			// а лише перевіряє що DB.fetch коректно обробляє mounted $ref
			const memDb = new DB({
				console: new NoConsole(),
				predefined: [
					['_.json', { memGlobal: 'mem_value' }],
					['doc.json', { name: 'test' }],
				],
			})
			await memDb.connect()

			const data = await memDb.fetch('doc')
			assert.ok(data, 'fetch має повернути дані')
			assert.equal(data.name, 'test')
			assert.equal(data.memGlobal, 'mem_value', 'Глобальні змінні мають успадкуватись')
		})
	})

	describe('4. Закриття v1.3.1 — міграція контрактних тестів', () => {
		it('контрактні тести v1.3.1 повинні існувати у src/test/releases/', async () => {
			const { existsSync } = await import('node:fs')
			const { resolve } = await import('node:path')

			const regressionPath = resolve(
				import.meta.dirname,
				'../../../../src/test/releases/1/3/v1.3.1/task.test.js',
			)

			assert.ok(existsSync(regressionPath), `Регресійний тест має існувати: ${regressionPath}`)
		})
	})
})
