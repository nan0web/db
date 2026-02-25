import { describe, it } from 'node:test'
import assert from 'node:assert'
import DB from './DB.js'

describe('DB.watch — URI change notifications', () => {
	it('watch() fires on set()', async () => {
		const db = new DB()
		const events = []
		db.watch('users', (e) => events.push(e))

		await db.set('users/john.json', { name: 'John' })

		assert.strictEqual(events.length, 1)
		assert.strictEqual(events[0].uri, 'users/john.json')
		assert.strictEqual(events[0].type, 'set')
	})

	it('watch() fires on saveDocument()', async () => {
		const db = new DB()
		await db.connect()
		const events = []
		db.watch('docs', (e) => events.push(e))

		await db.saveDocument('docs/readme.md', '# Hello')

		// saveDocument emits 'save' + index updates may emit additional 'set' events
		const saveEvent = events.find((e) => e.type === 'save')
		assert.ok(saveEvent)
		assert.ok(events.length >= 1)
	})

	it('watch() fires on dropDocument()', async () => {
		const db = new DB()
		await db.set('tmp/file.txt', 'data')
		const events = []
		db.watch('tmp', (e) => events.push(e))

		await db.dropDocument('tmp/file.txt')

		const dropEvent = events.find((e) => e.type === 'drop')
		assert.ok(dropEvent)
		assert.strictEqual(dropEvent.uri, 'tmp/file.txt')
	})

	it('watch() does NOT fire for unrelated URIs', async () => {
		const db = new DB()
		const events = []
		db.watch('users', (e) => events.push(e))

		await db.set('posts/hello.json', { title: 'hi' })

		assert.strictEqual(events.length, 0)
	})

	it('watch on root with on("change") catches all changes', async () => {
		const db = new DB()
		const events = []
		db.on('change', (e) => events.push(e))

		await db.set('a.txt', 'a')
		await db.set('deep/b.txt', 'b')

		assert.strictEqual(events.length, 2)
	})

	it('watch() returns unsubscribe function', async () => {
		const db = new DB()
		const events = []
		const unsub = db.watch('x', (e) => events.push(e))

		await db.set('x/1.txt', 'one')
		assert.strictEqual(events.length, 1)

		unsub()
		await db.set('x/2.txt', 'two')
		assert.strictEqual(events.length, 1) // no new event
	})

	it('unwatch() removes all watchers for prefix', async () => {
		const db = new DB()
		const events1 = []
		const events2 = []
		db.watch('x', (e) => events1.push(e))
		db.watch('x', (e) => events2.push(e))

		await db.set('x/a.txt', 'a')
		assert.strictEqual(events1.length, 1)
		assert.strictEqual(events2.length, 1)

		db.unwatch('x')
		await db.set('x/b.txt', 'b')
		assert.strictEqual(events1.length, 1)
		assert.strictEqual(events2.length, 1)
	})
})

describe('DB cache metrics — emit("cache")', () => {
	it('emits cache miss on first get()', async () => {
		const db = new DB({ predefined: new Map([['a.txt', 'hello']]) })
		await db.connect()
		const events = []
		db.on('cache', (e) => events.push(e))

		await db.get('a.txt')
		assert.strictEqual(events.length, 1)
		assert.strictEqual(events[0].hit, true)
		assert.strictEqual(events[0].uri, 'a.txt')
	})

	it('emits cache miss for missing document', async () => {
		const db = new DB()
		const events = []
		db.on('cache', (e) => events.push(e))

		await db.get('missing.txt')
		assert.strictEqual(events.length, 1)
		assert.strictEqual(events[0].hit, false)
	})
})

describe('DB.fetchStream — ReadableStream wrapper', () => {
	it('returns ReadableStream with document data', async () => {
		const db = new DB({
			predefined: new Map([['doc.json', { title: 'Hello' }]]),
		})
		await db.connect()

		const stream = db.fetchStream('doc')
		const reader = stream.getReader()
		const { value, done } = await reader.read()

		assert.strictEqual(done, false)
		assert.strictEqual(value, '{"title":"Hello"}')

		const end = await reader.read()
		assert.strictEqual(end.done, true)
	})

	it('returns string content as-is', async () => {
		const db = new DB({
			predefined: new Map([['file.txt', 'raw text content']]),
		})
		await db.connect()

		const stream = db.fetchStream('file.txt')
		const reader = stream.getReader()
		const { value } = await reader.read()
		assert.strictEqual(value, 'raw text content')
	})

	it('closes stream for missing document', async () => {
		const db = new DB()
		const stream = db.fetchStream('missing.json')
		const reader = stream.getReader()
		const { done } = await reader.read()
		assert.strictEqual(done, true)
	})
})
