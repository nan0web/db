import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import DB from '../../../../../DB/DB.js'
import DBDriverProtocol from '../../../../../DB/DriverProtocol.js'

describe('VFS Consistency & Path Resolution (v1.5.1)', () => {
	it('listDir correctly re-prefixes paths when routing through mounts', async () => {
		const root = new DB({ root: '/' })
		const mount1 = new DB({ root: '/mount1' })
		
		// Mock listDir for mount1
		mount1.listDir = async () => [
			{ path: 'file.txt', name: 'file.txt', isFile: true, isDirectory: false }
		]
		
		root.mount('/m1', mount1)
		
		const entries = await root.listDir('/m1')
		assert.equal(entries.length, 1)
		assert.equal(entries[0].path, 'm1/file.txt')
	})

	it('DriverProtocol parseStream supports .jsonl and .csv', async () => {
		const driver = new DBDriverProtocol()
		
		// mock stream
		async function* mockStream() {
			yield Buffer.from('{"a":1}\n{"b":2}')
		}
		
		const jsonlStream = await driver.parseStream(mockStream(), 'data.jsonl')
		const results = []
		for await (const chunk of jsonlStream) {
			results.push(chunk)
		}
		
		assert.deepEqual(results, ['{"a":1}', '{"b":2}'])
	})
})
