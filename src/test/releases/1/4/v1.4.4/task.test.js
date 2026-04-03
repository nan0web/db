import assert from 'node:assert/strict'
import { it, describe } from 'node:test'
import DB from '../../../../../DB/DB.js'
import Directory from '../../../../../Directory.js'

describe('Release v1.4.4: .nan0 extension support', () => {
	it('should have .nan0 in DB.DATA_EXTNAMES', () => {
		assert.ok(DB.DATA_EXTNAMES.includes('.nan0'))
	})

	it('should have .nan0 in Directory.DATA_EXTNAMES', () => {
		assert.ok(Directory.DATA_EXTNAMES.includes('.nan0'))
	})

	it('should recognize .nan0 as data extension in Directory.isData', () => {
		assert.strictEqual(Directory.isData('test.nan0'), true)
	})

	it('should recognize .nan0 as data extension in DB instance', () => {
		const db = new DB()
		assert.strictEqual(db.isData('test.nan0'), true)
	})
})
