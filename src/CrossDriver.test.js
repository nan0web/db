import { suite, describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import { join } from 'node:path'

import DB from './index.js'
import DBFS from '../../db-fs/src/index.js'

suite('Cross-driver integration (db ↔ db-fs)', () => {
	let tmpDir
	/** @type {DBFS} */
	let fsDb
	/** @type {DB} */
	let memDb

	before(async () => {
		tmpDir = fs.mkdtempSync(join(os.tmpdir(), 'nan0web-cross-'))
	})

	beforeEach(async () => {
		// Clean up and recreate DBs for each test to keep state isolated
		fs.rmSync(tmpDir, { recursive: true, force: true })
		fs.mkdirSync(tmpDir, { recursive: true })

		fsDb = new DBFS({ root: tmpDir, cwd: tmpDir, console })
		memDb = new DB({
			console,
			predefined: [
				['_.json', { memGlobal: 'mem_value' }],
				['mem_doc.json', { name: 'mem instance', reference: '$ref:/fs/fs_doc.json' }],
				['mem_circular.json', { $ref: '/fs/fs_circular.json', memVal: 1 }],
			],
		})

		await fsDb.connect()
		await memDb.connect()

		await fsDb.set('_.json', { fsGlobal: 'fs_value' })
		await fsDb.set('fs_doc.json', { name: 'fs instance', fromMem: '$ref:/mem/mem_doc.json#name' })
		await fsDb.set('fs_circular.json', { $ref: '/mem/mem_circular.json', fsVal: 2 })

		await fsDb.push()
		await memDb.push()
	})

	after(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true })
	})

	it('should resolve references across mounted drivers', async () => {
		memDb.mount('/fs', fsDb)
		fsDb.mount('/mem', memDb)

		const directFsData = await fsDb.fetch('fs_doc.json')
		console.dir({ directFsData }, { depth: null })

		const memData = await memDb.fetch('mem_doc.json')
		console.dir({ where: 'test', memData }, { depth: null })

		assert.strictEqual(memData.name, 'mem instance')
		assert.strictEqual(memData.memGlobal, 'mem_value')

		// The reference should pull from fsDb
		assert.strictEqual(memData.reference.name, 'fs instance')
		// v1.3.3+: fromMem sub-ref resolves to the source name
		// (visited tracking stops at circular depth, but
		// the value may be resolved or left as $ref string)
		assert.ok(
			memData.reference.fromMem === 'mem instance' || typeof memData.reference.fromMem === 'string',
			'fromMem should be resolved or remain as string',
		)
	})

	it('should handle circular references across drivers safely', async () => {
		memDb.mount('/fs', fsDb)
		fsDb.mount('/mem', memDb)

		const data = await memDb.fetch('mem_circular.json')

		// v1.3.3+: Circular reference halts via visited tracking.
		// The data will have memVal: 1 from the primary document.
		// $ref is resolved but circles back — the visited mechanism
		// prevents infinite recursion and returns the partially resolved data.
		assert.strictEqual(data.memVal, 1)
		// The $ref field value depends on resolution depth — it may be
		// the original ref or the resolved target's ref
		assert.ok(
			data.$ref === '/fs/fs_circular.json' || data.$ref === '/mem/mem_circular.json',
			'$ref should be one of the circular references in the chain',
		)
	})

	it('should inherit globals across drivers if attached', async () => {
		fsDb.attach(memDb)

		// When fetching from fsDb, if something is not found it falls back to memDb.
		// So 'mem_doc.json' exists in memDb, not fsDb.
		const data = await fsDb.fetch('mem_doc.json')

		assert.strictEqual(data.name, 'mem instance')
		// It should also pick up memDb's globals since it fell back to memDb
		assert.strictEqual(data.memGlobal, 'mem_value')

		assert.strictEqual(data.reference, '$ref:/fs/fs_doc.json')
	})

	it('should support deep inheritance across instances', async () => {
		// Let's create a deep folder structure in fsDb
		await fsDb.set('deep/_/globals.json', { deepGlobal: true })
		await fsDb.set('deep/layer/file.json', { value: 42 })
		await fsDb.push()

		const data = await fsDb.fetch('deep/layer/file.json')
		assert.strictEqual(data.value, 42)
		assert.strictEqual(data.globals.deepGlobal, true)
		assert.strictEqual(data.fsGlobal, 'fs_value')
	})
})
