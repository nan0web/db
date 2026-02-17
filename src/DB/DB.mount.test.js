import { describe, it } from 'node:test'
import assert from 'node:assert'
import DB from './DB.js'

describe('DB.isDB (duck-typing)', () => {
	it('returns true for DB instance', () => {
		const db = new DB()
		assert.strictEqual(DB.isDB(db), true)
	})

	it('returns true for duck-typed object with fetch/set/stat', () => {
		const fake = {
			fetch: () => {},
			set: () => {},
			stat: () => {},
		}
		assert.strictEqual(DB.isDB(fake), true)
	})

	it('returns false for null', () => {
		assert.ok(!DB.isDB(null))
	})

	it('returns false for undefined', () => {
		assert.ok(!DB.isDB(undefined))
	})

	it('returns false for plain object without methods', () => {
		assert.strictEqual(DB.isDB({ name: 'not-a-db' }), false)
	})

	it('returns false for partial match (missing stat)', () => {
		const partial = {
			fetch: () => {},
			set: () => {},
		}
		assert.strictEqual(DB.isDB(partial), false)
	})
})

describe('DB.mount (VFS routing)', () => {
	it('mount() adds DB to mounts map', () => {
		const root = new DB()
		const cache = new DB()
		root.mount('cache', cache)
		assert.strictEqual(root.mounts.size, 1)
	})

	it('mount() throws TypeError for non-DB', () => {
		const root = new DB()
		assert.throws(() => root.mount('cache', {}), {
			name: 'TypeError',
			message: 'Mounted instance must be a DB',
		})
	})

	it('mount() accepts duck-typed DB', () => {
		const root = new DB()
		const fake = {
			fetch: () => {},
			set: () => {},
			stat: () => {},
		}
		root.mount('cache', fake)
		assert.strictEqual(root.mounts.size, 1)
	})

	it('unmount() removes mount', () => {
		const root = new DB()
		const cache = new DB()
		root.mount('cache', cache)
		assert.strictEqual(root.mounts.size, 1)
		const result = root.unmount('cache')
		assert.strictEqual(result, true)
		assert.strictEqual(root.mounts.size, 0)
	})

	it('unmount() returns false for non-existent mount', () => {
		const root = new DB()
		assert.strictEqual(root.unmount('nothing'), false)
	})

	it('_findMount() returns null when no mounts match', () => {
		const root = new DB()
		assert.strictEqual(root._findMount('some/path'), null)
	})

	it('_findMount() matches prefix and strips it', () => {
		const root = new DB()
		const cache = new DB()
		root.mount('cache', cache)

		const result = root._findMount('cache/user_1')
		assert.ok(result)
		assert.strictEqual(result.db, cache)
		assert.strictEqual(result.subUri, '/user_1')
	})

	it('_findMount() matches exact prefix', () => {
		const root = new DB()
		const cache = new DB()
		root.mount('cache', cache)

		const result = root._findMount('cache')
		assert.ok(result)
		assert.strictEqual(result.db, cache)
		assert.strictEqual(result.subUri, '/')
	})

	it('_findMount() uses longest prefix match', () => {
		const root = new DB()
		const media = new DB({ root: 'media' })
		const mediaImages = new DB({ root: 'images' })

		root.mount('media', media)
		root.mount('media/images', mediaImages)

		const result = root._findMount('media/images/logo.png')
		assert.ok(result)
		assert.strictEqual(result.db, mediaImages)
		assert.strictEqual(result.subUri, '/logo.png')

		const result2 = root._findMount('media/video.mp4')
		assert.ok(result2)
		assert.strictEqual(result2.db, media)
		assert.strictEqual(result2.subUri, '/video.mp4')
	})
})

describe('DB.mount routing (get/set/stat/fetch)', () => {
	it('set() routes to mounted DB', async () => {
		const root = new DB()
		const cache = new DB()
		await cache.connect()

		root.mount('cache', cache)
		await root.set('cache/user_1', { name: 'John' })

		// set() on mounted DB stores under subUri '/user_1'
		const data = cache.data.get('/user_1')
		assert.deepStrictEqual(data, { name: 'John' })
	})

	it('get() routes to mounted DB', async () => {
		const root = new DB()
		const cache = new DB()
		await cache.connect()
		await cache.set('user_1', { name: 'John' })

		root.mount('cache', cache)
		const data = await root.get('cache/user_1')
		assert.deepStrictEqual(data, { name: 'John' })
	})

	it('stat() routes to mounted DB', async () => {
		const root = new DB()
		const cache = new DB()
		await cache.connect()
		await cache.set('user_1', { name: 'John' })

		root.mount('cache', cache)
		const stat = await root.stat('cache/user_1')
		assert.ok(stat)
		assert.ok(stat.mtimeMs > 0)
	})

	it('fetch() routes to mounted DB', async () => {
		const root = new DB()
		const cache = new DB({
			predefined: new Map([['config.json', { theme: 'dark' }]]),
		})
		await cache.connect()

		root.mount('cache', cache)
		const data = await root.fetch('cache/config')
		assert.deepStrictEqual(data, { theme: 'dark' })
	})

	it('saveDocument() routes to mounted DB', async () => {
		const root = new DB()
		const store = new DB()
		await store.connect()

		root.mount('store', store)
		await root.saveDocument('store/doc.json', { saved: true })

		const data = await store.get('doc.json')
		assert.deepStrictEqual(data, { saved: true })
	})

	it('dropDocument() routes to mounted DB', async () => {
		const root = new DB()
		const store = new DB()
		await store.connect()
		// Store with leading / to match subUri format from _findMount
		await store.set('/doc.json', { saved: true })

		root.mount('store', store)
		const deleted = await root.dropDocument('store/doc.json')
		assert.strictEqual(deleted, true)

		// data should be removed from store
		assert.strictEqual(store.data.has('/doc.json'), false)
	})

	it('non-mounted URIs use local storage', async () => {
		const root = new DB()
		const cache = new DB()
		await root.connect()
		await cache.connect()

		root.mount('cache', cache)
		await root.set('local/data', { local: true })

		const data = await root.get('local/data')
		assert.deepStrictEqual(data, { local: true })

		assert.strictEqual(cache.data.has('local/data'), false)
	})
})
