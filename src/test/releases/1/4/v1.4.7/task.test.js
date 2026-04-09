import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import DB from '../../../../../DB/DB.js'

describe('v1.4.7: DB Directory Read Prevention & Browse Utility', () => {
	it('should strictly verify stats.isFile before loading a document to prevent reading directories', async () => {
		const db = new DB({
			predefined: [
				['some_dir/', null]
			]
		})
		await db.connect()
		
		// Attempting to load without an extension against a directory directly
		// should return the fallback value, because directories are not files.
		const result = await db.loadDocument('some_dir', 'fallback_value')
		assert.equal(result, 'fallback_value')
	})

	it('should fall back to checking extensions even if a directory directly matches the URI without extension', async () => {
		const db = new DB({
			predefined: [
				['index/', null],
				['index.json', { key: 'value' }]
			]
		})
		await db.connect()
		
		// If DB correctly refuses to read the `index` directory, it will naturally try `index.json`
		const result = await db.fetch('index')
		assert.deepEqual(result, { key: 'value' })
	})

	it('should support recursive browsing via browse() utility', async () => {
		const db = new DB({
			predefined: [
				['root/', null],
				['root/1.json', { value: 1 }],
				['root/sub/', null],
				['root/sub/2.json', { value: 2 }]
			]
		})
		await db.connect()

		const results = []
		for await (const entry of db.browse('root/', { includeDirs: true })) {
			results.push(entry.path)
		}
		
		assert.equal(results.some(r => r.includes('1.json')), true, `results: ${results.join(', ')}`)
		assert.equal(results.length, 3, `results: ${results.join(', ')}`)
	})
})
