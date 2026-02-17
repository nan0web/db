import { describe, it } from 'node:test'
import assert from 'node:assert'
import DB from './DB.js'

// Test model with static from() — Model-as-Schema pattern
class UserModel {
	static name = { help: 'User name', default: '' }
	static age = { help: 'User age', default: 0 }

	/** @type {string} */
	name = UserModel.name.default
	/** @type {number} */
	age = UserModel.age.default

	static from(data) {
		const instance = new UserModel()
		if (data.name) instance.name = String(data.name)
		if (data.age) instance.age = Number(data.age)
		return instance
	}
}

// Test model with constructor only (no static from)
class ConfigModel {
	constructor(data = {}) {
		this.theme = data.theme || 'light'
		this.lang = data.lang || 'uk'
	}
}

describe('DB Model Hydration', () => {
	it('model() registers a Model for a prefix', () => {
		const db = new DB()
		db.model('users', UserModel)
		assert.strictEqual(db.models.size, 1)
	})

	it('_findModel() returns registered Model for matching URI', () => {
		const db = new DB()
		db.model('users', UserModel)

		const found = db._findModel('users/john')
		assert.strictEqual(found, UserModel)
	})

	it('_findModel() returns null when no model matches', () => {
		const db = new DB()
		db.model('users', UserModel)

		const found = db._findModel('posts/hello')
		assert.strictEqual(found, null)
	})

	it('_findModel() uses longest prefix match', () => {
		const db = new DB()
		db.model('users', UserModel)
		db.model('users/config', ConfigModel)

		assert.strictEqual(db._findModel('users/config/theme'), ConfigModel)
		assert.strictEqual(db._findModel('users/john'), UserModel)
	})

	it('_findModel() matches "/" (root) for any URI', () => {
		const db = new DB({ Model: UserModel })
		assert.strictEqual(db._findModel('anything'), UserModel)
	})

	it('_hydrate() uses Model.from() when available', () => {
		const db = new DB()
		const result = db._hydrate({ name: 'John', age: 30 }, UserModel)
		assert.ok(result instanceof UserModel)
		assert.strictEqual(result.name, 'John')
		assert.strictEqual(result.age, 30)
	})

	it('_hydrate() falls back to new Model(data) when from() is absent', () => {
		const db = new DB()
		const result = db._hydrate({ theme: 'dark', lang: 'en' }, ConfigModel)
		assert.ok(result instanceof ConfigModel)
		assert.strictEqual(result.theme, 'dark')
		assert.strictEqual(result.lang, 'en')
	})

	it('_hydrate() returns null/undefined for non-object data', () => {
		const db = new DB()
		assert.strictEqual(db._hydrate(null, UserModel), null)
		assert.strictEqual(db._hydrate(undefined, UserModel), undefined)
	})

	it('fetch() hydrates data through registered Model', async () => {
		const db = new DB({
			predefined: new Map([['users/john.json', { name: 'John', age: 30 }]]),
		})
		await db.connect()
		db.model('users', UserModel)

		const result = await db.fetch('users/john')
		assert.ok(result instanceof UserModel)
		assert.strictEqual(result.name, 'John')
		assert.strictEqual(result.age, 30)
	})

	it('fetch() hydrates via constructor-only Model (Model shorthand)', async () => {
		const db = new DB({
			predefined: new Map([['config.json', { theme: 'dark', lang: 'en' }]]),
			Model: ConfigModel,
		})
		await db.connect()

		const result = await db.fetch('config')
		assert.ok(result instanceof ConfigModel)
		assert.strictEqual(result.theme, 'dark')
		assert.strictEqual(result.lang, 'en')
	})

	it('fetch() does NOT hydrate when no model matches', async () => {
		const db = new DB({
			predefined: new Map([['posts/hello.json', { title: 'Hello' }]]),
		})
		await db.connect()
		db.model('users', UserModel)

		const result = await db.fetch('posts/hello')
		assert.ok(!(result instanceof UserModel))
		assert.deepStrictEqual(result, { title: 'Hello' })
	})

	it('fetch() hydrates fallback results too', async () => {
		const primary = new DB()
		await primary.connect()
		primary.model('users', UserModel)

		const fallback = new DB({
			predefined: new Map([['users/jane.json', { name: 'Jane', age: 25 }]]),
		})
		await fallback.connect()
		primary.attach(fallback)

		const result = await primary.fetch('users/jane')
		assert.ok(result instanceof UserModel)
		assert.strictEqual(result.name, 'Jane')
		assert.strictEqual(result.age, 25)
	})

	it('Constructor with models Map registers multiple models', () => {
		const models = new Map([
			['users', UserModel],
			['config', ConfigModel],
		])
		const db = new DB({ models })
		assert.strictEqual(db.models.size, 2)
		assert.strictEqual(db._findModel('users/1'), UserModel)
		assert.strictEqual(db._findModel('config/theme'), ConfigModel)
	})
})
