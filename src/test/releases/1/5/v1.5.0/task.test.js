import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import DB from '../../../../../DB/DB.js'
import DBDriverProtocol from '../../../../../DB/DriverProtocol.js'

describe('Stream Architecture Refactoring (v1.5.0)', () => {
	class FakeDriverProtocol extends DBDriverProtocol {
		constructor(config) {
			super(config)
			// Mocking actual stream implementation
			this.driver = {
				stream: async (uri) => {
					if (uri.endsWith('not_found.jsonl')) {
						throw new Error('ENOENT: no such file')
					}
					if (uri.endsWith('access_denied.jsonl')) {
						throw new Error('EACCES: permission denied')
					}
					
					return (async function* () {
						if (uri.endsWith('.jsonl') || uri.endsWith('.csv')) {
							// Fragmented chunks
							yield Buffer.from('{"id":1, "name": "al')
							yield Buffer.from('ex"}\n{"id":2}')
						} else {
							yield Buffer.from('raw_data_1')
							yield Buffer.from('raw_data_2')
						}
					})()
				}
			}
		}
	}

	it('correctly buffers divided chunks into single lines for .jsonl', async () => {
		const db = new DB({
			driver: new FakeDriverProtocol({ cwd: '.', root: '.' })
		})

		const stream = await db.stream('test.jsonl')
		const lines = []
		for await (const line of stream) {
			lines.push(line)
		}

		assert.strictEqual(lines.length, 2)
		assert.strictEqual(lines[0], '{"id":1, "name": "alex"}')
		assert.strictEqual(lines[1], '{"id":2}')
	})

	it('yields raw stream for non-jsonl/csv files', async () => {
		const db = new DB({
			driver: new FakeDriverProtocol({ cwd: '.', root: '.' })
		})

		const stream = await db.stream('test.bin')
		const chunks = []
		for await (const chunk of stream) {
			chunks.push(chunk.toString('utf-8'))
		}

		assert.strictEqual(chunks.length, 2)
		assert.strictEqual(chunks[0], 'raw_data_1')
		assert.strictEqual(chunks[1], 'raw_data_2')
	})

	it('throws error for non-existent file', async () => {
		const db = new DB({
			driver: new FakeDriverProtocol({ cwd: '.', root: '.' })
		})

		await assert.rejects(
			async () => await db.stream('not_found.jsonl'),
			/ENOENT: no such file/
		)
	})

	it('throws error for permission denied', async () => {
		const db = new DB({
			driver: new FakeDriverProtocol({ cwd: '.', root: '.' })
		})

		await assert.rejects(
			async () => await db.stream('access_denied.jsonl'),
			/EACCES: permission denied/
		)
	})
})
