import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import DB from './DB.js'

describe('DB.dbs multiple databases', () => {
	it('accepts array of DB instances in constructor', () => {
		const db1 = new DB({ root: '/db1' })
		const db2 = new DB({ root: '/db2' })

		const mainDB = new DB({
			dbs: [db1, db2],
		})

		assert.equal(mainDB.dbs.length, 2)
		assert.ok(mainDB.dbs[0] instanceof DB)
		assert.ok(mainDB.dbs[1] instanceof DB)
		assert.equal(mainDB.dbs[0].root, '/db1')
		assert.equal(mainDB.dbs[1].root, '/db2')
	})

	it('attaches new database instance', () => {
		const mainDB = new DB()
		const dbToAttach = new DB({ root: '/attached' })

		mainDB.attach(dbToAttach)

		assert.equal(mainDB.dbs.length, 1)
		assert.equal(mainDB.dbs[0].root, '/attached')
	})

	it('throws error when attaching non-DB instance', () => {
		const mainDB = new DB()

		assert.throws(
			() => {
				mainDB.attach({})
			},
			TypeError,
			'It is possible to attach only DB or extended databases',
		)
	})

	it('detaches existing database instance', () => {
		const db1 = new DB({ root: '/db1' })
		const db2 = new DB({ root: '/db2' })

		const mainDB = new DB({
			dbs: [db1, db2],
		})

		const detached = mainDB.detach(db1)

		assert.equal(mainDB.dbs.length, 1)
		assert.equal(mainDB.dbs[0].root, '/db2')
		assert.ok(Array.isArray(detached))
		assert.equal(detached[0], db1)
	})

	it('returns false when detaching non-existent database', () => {
		const mainDB = new DB()
		const dbToDetach = new DB({ root: '/notattached' })

		const result = mainDB.detach(dbToDetach)

		assert.equal(result, false)
		assert.equal(mainDB.dbs.length, 0)
	})
})
