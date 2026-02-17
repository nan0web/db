import { describe, it } from 'node:test'
import assert from 'node:assert'
import DB from './DB.js'

describe('DB.attach fallback chain', () => {
	it('attach() accepts DB instance', () => {
		const primary = new DB()
		const fallback = new DB()
		primary.attach(fallback)
		assert.strictEqual(primary.dbs.length, 1)
	})

	it('attach() accepts duck-typed DB', () => {
		const primary = new DB()
		const fake = { fetch: () => {}, set: () => {}, stat: () => {} }
		primary.attach(fake)
		assert.strictEqual(primary.dbs.length, 1)
	})

	it('attach() throws for non-DB', () => {
		const primary = new DB()
		assert.throws(() => primary.attach({}), {
			name: 'TypeError',
		})
	})

	it('detach() removes attached DB', () => {
		const primary = new DB()
		const fallback = new DB({ root: 'fallback', cwd: '.' })
		primary.attach(fallback)
		assert.strictEqual(primary.dbs.length, 1)
		primary.detach(fallback)
		assert.strictEqual(primary.dbs.length, 0)
	})

	it('fetch() falls back to attached DB when primary returns null', async () => {
		const primary = new DB()
		await primary.connect()

		const fallback = new DB({
			predefined: new Map([['config.json', { fallback: true }]]),
		})
		await fallback.connect()

		primary.attach(fallback)

		const result = await primary.fetch('config')
		assert.deepStrictEqual(result, { fallback: true })
	})

	it('fetch() prefers primary over fallback', async () => {
		const primary = new DB({
			predefined: new Map([['config.json', { source: 'primary' }]]),
		})
		await primary.connect()

		const fallback = new DB({
			predefined: new Map([['config.json', { source: 'fallback' }]]),
		})
		await fallback.connect()

		primary.attach(fallback)

		const result = await primary.fetch('config')
		assert.deepStrictEqual(result, { source: 'primary' })
	})

	it('fetch() tries multiple fallbacks in order', async () => {
		const primary = new DB()
		await primary.connect()

		const fallback1 = new DB()
		await fallback1.connect()

		const fallback2 = new DB({
			predefined: new Map([['data.json', { from: 'fallback2' }]]),
		})
		await fallback2.connect()

		primary.attach(fallback1)
		primary.attach(fallback2)

		const result = await primary.fetch('data')
		assert.deepStrictEqual(result, { from: 'fallback2' })
	})

	it('fetch() emits "fallback" event when fallback is used', async () => {
		const primary = new DB()
		await primary.connect()

		const fallback = new DB({
			predefined: new Map([['config.json', { fallback: true }]]),
		})
		await fallback.connect()
		primary.attach(fallback)

		const events = []
		primary.on('fallback', (event) => events.push(event))

		await primary.fetch('config')
		assert.strictEqual(events.length, 1)
		assert.strictEqual(events[0].uri, 'config')
		assert.strictEqual(events[0].from, primary)
		assert.strictEqual(events[0].to, fallback)
	})

	it('fetch() does NOT emit "fallback" when primary succeeds', async () => {
		const primary = new DB({
			predefined: new Map([['config.json', { primary: true }]]),
		})
		await primary.connect()

		const fallback = new DB({
			predefined: new Map([['config.json', { fallback: true }]]),
		})
		await fallback.connect()
		primary.attach(fallback)

		const events = []
		primary.on('fallback', (event) => events.push(event))

		await primary.fetch('config')
		assert.strictEqual(events.length, 0)
	})

	it('fetch() returns null when both primary and fallback have nothing', async () => {
		const primary = new DB()
		await primary.connect()

		const fallback = new DB()
		await fallback.connect()
		primary.attach(fallback)

		const result = await primary.fetch('nonexistent')
		assert.strictEqual(result, undefined)
	})
})

describe('DB.on/emit events', () => {
	it('on() registers listener and emit() triggers it', () => {
		const db = new DB()
		const calls = []
		db.on('test', (data) => calls.push(data))
		db.emit('test', { hello: 'world' })
		assert.strictEqual(calls.length, 1)
		assert.deepStrictEqual(calls[0], { hello: 'world' })
	})

	it('multiple listeners are called in order', () => {
		const db = new DB()
		const calls = []
		db.on('test', () => calls.push('first'))
		db.on('test', () => calls.push('second'))
		db.emit('test', {})
		assert.deepStrictEqual(calls, ['first', 'second'])
	})

	it('emit with no listeners does not throw', () => {
		const db = new DB()
		assert.doesNotThrow(() => db.emit('unknown', {}))
	})
})
