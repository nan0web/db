import { it, describe } from 'node:test'
import assert from 'node:assert/strict'
import { DB } from '../../../../../index.js'

describe('Реліз v1.4.1: Mount Architecture Security', () => {
	describe('1. seal() — Запечатування mount-реєстру', () => {
		it('seal() блокує подальші mount() виклики', () => {
			const root = new DB()
			root.seal()
			assert.throws(() => root.mount('cache', new DB()), {
				message: /Mount registry is sealed/,
			})
		})

		it('seal() блокує подальші unmount() виклики', () => {
			const root = new DB()
			const cache = new DB()
			root.mount('cache', cache)
			root.seal()
			assert.throws(() => root.unmount('cache'), {
				message: /Mount registry is sealed/,
			})
		})

		it('sealed getter повертає false до виклику seal()', () => {
			const root = new DB()
			assert.strictEqual(root.sealed, false)
		})

		it('sealed getter повертає true після виклику seal()', () => {
			const root = new DB()
			root.seal()
			assert.strictEqual(root.sealed, true)
		})

		it('mount() працює нормально до seal()', () => {
			const root = new DB()
			const home = new DB()
			root.mount('~', home)
			assert.strictEqual(root.mounts.size, 1)
			root.seal()
			assert.strictEqual(root.mounts.size, 1)
		})

		it('існуючі монтування залишаються функціональними після seal()', async () => {
			const root = new DB()
			const home = new DB()
			await home.connect()
			await home.set('zones', [{ name: 'Balcony' }])

			root.mount('~', home)
			root.seal()

			const data = await root.get('~/zones')
			assert.deepStrictEqual(data, [{ name: 'Balcony' }])
		})
	})

	describe('2. Error contract — _findMount() для зарезервованих префіксів', () => {
		it('кидає Error для немонтованого ~ префікса', () => {
			const root = new DB()
			assert.throws(() => root._findMount('~/zones'), {
				message: /Mount point "~" not found.*Did you forget to call db\.mount/,
			})
		})

		it('кидає Error для немонтованого @private префікса', () => {
			const root = new DB()
			assert.throws(() => root._findMount('@private/wallet'), {
				message: /Mount point "@private" not found.*Did you forget to call db\.mount/,
			})
		})

		it('повертає null для звичайних немонтованих шляхів (fallback)', () => {
			const root = new DB()
			const result = root._findMount('some/regular/path')
			assert.strictEqual(result, null)
		})

		it('НЕ кидає Error для ~ коли він змонтований', () => {
			const root = new DB()
			const home = new DB()
			root.mount('~', home)
			const result = root._findMount('~/zones')
			assert.ok(result)
			assert.strictEqual(result.db, home)
		})
	})
})
