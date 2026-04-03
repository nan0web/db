import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DB } from '../../../../../../src/index.js'

describe('Contract v1.4.5: Root Mount Path Matching', () => {
	it('matches paths for root mount (prefix: \'\')', async () => {
		const rootDB = new DB()
		const targetDB = new DB({ root: 'target' })
		
		// This is what failed before: mounting at root
		rootDB.mount('', targetDB)
		
		// Should match 'some/path' and return { db: targetDB, subUri: '/some/path' }
		const match = rootDB._findMount('some/path')
		
		assert.ok(match, 'Should find a match for empty root mount')
		assert.strictEqual(match.db, targetDB, 'Should return the mounted DB')
		assert.strictEqual(match.subUri, '/some/path', 'Should return full path as sub-URI for root mount')
	})

	it('matches exact root path for root mount', async () => {
		const rootDB = new DB()
		const targetDB = new DB({ root: 'target' })
		
		rootDB.mount('', targetDB)
		
		const match = rootDB._findMount('.')
		assert.ok(match, 'Should match dot for root mount')
		assert.strictEqual(match.subUri, '/', 'Should return / for dot match')
	})
})
