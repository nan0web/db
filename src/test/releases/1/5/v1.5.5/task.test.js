import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DB } from '../../../../../index.js'

describe('v1.5.5 Contract: Directory Metadata & connect() Stabilization', () => {
	it('How to ensure directory existence metadata via statDocument?', async () => {
		const db = new DB({
			predefined: [['src/foo.js', 'data']],
		})
		await db.connect()

		const s = await db.statDocument('src/')

		assert.equal(s.isDirectory, true, 'Should be recognized as directory')
		assert.equal(s.exists, true, 'Should exist if it contains files')
		assert.ok(s.mtimeMs > 0, 'Should inherit mtime from children')
		assert.ok(s.size > 0, 'Should inherit size from children')
	})

	it('How to ensure browse works correctly after connect() on sub-directory?', async () => {
		const db = new DB({
			predefined: [
				['src/foo.js', 'data'],
				['src/bar.js', 'more data'],
				['README.md', 'root file'],
			],
		})

		await db.connect()

		const entries = []
		for await (const entry of db.browse('src/')) {
			entries.push(entry.path)
		}

		assert.ok(entries.includes('src/foo.js'), 'Should contain foo.js')
		assert.ok(entries.includes('src/bar.js'), 'Should contain bar.js')
		assert.ok(!entries.includes('README.md'), 'Should NOT contain root files when browsing src/')
	})
})
