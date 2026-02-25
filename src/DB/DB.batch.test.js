import { describe, it } from 'node:test'
import assert from 'node:assert'
import DB from './DB.js'

describe('DB.getAll — batch parallel read', () => {
	it('returns Map of URI → content', async () => {
		const db = new DB({
			predefined: new Map([
				['a.txt', 'alpha'],
				['b.txt', 'beta'],
				['c.txt', 'gamma'],
			]),
		})
		await db.connect()

		const results = await db.getAll(['a.txt', 'b.txt', 'c.txt'])
		assert.ok(results instanceof Map)
		assert.strictEqual(results.size, 3)
		assert.strictEqual(results.get('a.txt'), 'alpha')
		assert.strictEqual(results.get('b.txt'), 'beta')
		assert.strictEqual(results.get('c.txt'), 'gamma')
	})

	it('returns undefined for missing URIs', async () => {
		const db = new DB({ predefined: new Map([['a.txt', 'exists']]) })
		await db.connect()

		const results = await db.getAll(['a.txt', 'missing.txt'])
		assert.strictEqual(results.get('a.txt'), 'exists')
		assert.strictEqual(results.get('missing.txt'), undefined)
	})

	it('returns empty Map for empty input', async () => {
		const db = new DB()
		const results = await db.getAll([])
		assert.strictEqual(results.size, 0)
	})
})

describe('DB.setAll — batch write', () => {
	it('writes all entries and returns Map', async () => {
		const db = new DB()

		const results = await db.setAll([
			['x.txt', 'x-data'],
			['y.txt', 'y-data'],
		])

		assert.ok(results instanceof Map)
		assert.strictEqual(results.get('x.txt'), 'x-data')
		assert.strictEqual(results.get('y.txt'), 'y-data')
		assert.strictEqual(db.data.get('x.txt'), 'x-data')
		assert.strictEqual(db.data.get('y.txt'), 'y-data')
	})

	it('updates metadata for all entries', async () => {
		const db = new DB()
		await db.setAll([
			['a.json', { a: 1 }],
			['b.json', { b: 2 }],
		])

		assert.ok(db.meta.has('a.json'))
		assert.ok(db.meta.has('b.json'))
	})

	it('returns empty Map for empty input', async () => {
		const db = new DB()
		const results = await db.setAll([])
		assert.strictEqual(results.size, 0)
	})
})

// Model with static schema fields (Model-as-Schema pattern)
class UserModel {
	static name = { help: 'User name', default: '' }
	static age = { help: 'User age', default: 0 }

	static from(data) {
		const m = new UserModel()
		m.name = data.name
		m.age = data.age
		return m
	}
}

describe('DB.validate — schema validation', () => {
	it('valid data passes validation', async () => {
		const db = new DB({
			predefined: new Map([['users/john.json', { name: 'John', age: 30 }]]),
		})
		await db.connect()
		db.model('users', UserModel)

		const result = await db.validate('users/john')
		assert.strictEqual(result.valid, true)
		assert.strictEqual(result.errors.length, 0)
	})

	it('detects type mismatch', async () => {
		const db = new DB()
		db.model('users', UserModel)

		const result = await db.validate('users/bad', { name: 123, age: 'not-a-number' })
		assert.strictEqual(result.valid, false)
		assert.strictEqual(result.errors.length, 2)
		assert.strictEqual(result.errors[0].field, 'name')
		assert.ok(result.errors[0].message.includes('string'))
		assert.strictEqual(result.errors[1].field, 'age')
		assert.ok(result.errors[1].message.includes('number'))
	})

	it('returns valid when no model registered', async () => {
		const db = new DB()
		const result = await db.validate('anything', { x: 1 })
		assert.strictEqual(result.valid, true)
	})

	it('returns invalid for non-object data', async () => {
		const db = new DB()
		db.model('users', UserModel)

		const result = await db.validate('users/x', 'not-an-object')
		assert.strictEqual(result.valid, false)
		assert.strictEqual(result.errors[0].field, '*')
	})

	it('validates data from storage when no data argument', async () => {
		const db = new DB({
			predefined: new Map([['users/bad.json', { name: 42, age: 'oops' }]]),
		})
		await db.connect()
		db.model('users', UserModel)

		const result = await db.validate('users/bad')
		assert.strictEqual(result.valid, false)
		assert.strictEqual(result.errors.length, 2)
	})

	it('skips fields that are missing from data (no required check)', async () => {
		const db = new DB()
		db.model('users', UserModel)

		const result = await db.validate('users/partial', { name: 'Valid' })
		assert.strictEqual(result.valid, true)
	})
})
