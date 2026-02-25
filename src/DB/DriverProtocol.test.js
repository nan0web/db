import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import DBDriverProtocol from './DriverProtocol.js'
import AuthContext from './AuthContext.js'

describe('DBDriverProtocol — base protocol behavior', () => {
	describe('constructor', () => {
		it('defaults to cwd="." and root="."', () => {
			const driver = new DBDriverProtocol()
			assert.ok(driver instanceof DBDriverProtocol)
			assert.strictEqual(driver.cwd, '.')
			assert.strictEqual(driver.root, '.')
		})

		it('accepts config', () => {
			const driver = new DBDriverProtocol({ cwd: '/data', root: '/app' })
			assert.strictEqual(driver.cwd, '/data')
			assert.strictEqual(driver.root, '/app')
		})
	})

	describe('connect / disconnect', () => {
		it('returns undefined without driver', async () => {
			const driver = new DBDriverProtocol()
			assert.strictEqual(await driver.connect(), undefined)
			assert.strictEqual(await driver.disconnect(), undefined)
		})

		it('delegates to inner driver', async () => {
			const log = []
			const inner = new DBDriverProtocol()
			inner.connect = async () => {
				log.push('connect')
				return true
			}
			inner.disconnect = async () => {
				log.push('disconnect')
				return true
			}

			const outer = new DBDriverProtocol({ driver: inner })
			assert.strictEqual(await outer.connect(), true)
			assert.strictEqual(await outer.disconnect(), true)
			assert.deepStrictEqual(log, ['connect', 'disconnect'])
		})
	})

	describe('access', () => {
		it('returns undefined by default (no restrictions)', async () => {
			const driver = new DBDriverProtocol()
			const result = await driver.access('/file', 'r', new AuthContext())
			assert.strictEqual(result, undefined)
		})
	})

	describe('read', () => {
		it('returns undefined without driver', async () => {
			const driver = new DBDriverProtocol()
			assert.strictEqual(await driver.read('/missing'), undefined)
		})

		it('delegates to inner driver', async () => {
			const inner = new DBDriverProtocol()
			inner.read = async (uri) => `content of ${uri}`
			const outer = new DBDriverProtocol({ driver: inner })
			assert.strictEqual(await outer.read('/file.txt'), 'content of /file.txt')
		})
	})

	describe('write', () => {
		it('returns undefined without driver', async () => {
			const driver = new DBDriverProtocol()
			assert.strictEqual(await driver.write('/file', 'data'), undefined)
		})

		it('delegates to inner driver', async () => {
			const written = []
			const inner = new DBDriverProtocol()
			inner.write = async (uri, doc) => {
				written.push({ uri, doc })
				return true
			}
			const outer = new DBDriverProtocol({ driver: inner })

			assert.strictEqual(await outer.write('/x', 'data'), true)
			assert.deepStrictEqual(written, [{ uri: '/x', doc: 'data' }])
		})
	})

	describe('append', () => {
		it('returns undefined without driver', async () => {
			const driver = new DBDriverProtocol()
			assert.strictEqual(await driver.append('/file', 'chunk'), undefined)
		})

		it('delegates to inner driver', async () => {
			const inner = new DBDriverProtocol()
			inner.append = async () => true
			const outer = new DBDriverProtocol({ driver: inner })
			assert.strictEqual(await outer.append('/file', 'chunk'), true)
		})
	})

	describe('stat', () => {
		it('returns undefined without driver', async () => {
			const driver = new DBDriverProtocol()
			assert.strictEqual(await driver.stat('/file'), undefined)
		})

		it('delegates to inner driver', async () => {
			const inner = new DBDriverProtocol()
			inner.stat = async () => ({ size: 42 })
			const outer = new DBDriverProtocol({ driver: inner })
			assert.deepStrictEqual(await outer.stat('/file'), { size: 42 })
		})
	})

	describe('move', () => {
		it('returns undefined without driver', async () => {
			const driver = new DBDriverProtocol()
			assert.strictEqual(await driver.move('/a', '/b'), undefined)
		})

		it('delegates to inner driver', async () => {
			const inner = new DBDriverProtocol()
			inner.move = async () => true
			const outer = new DBDriverProtocol({ driver: inner })
			assert.strictEqual(await outer.move('/a', '/b'), true)
		})
	})

	describe('delete', () => {
		it('returns undefined without driver', async () => {
			const driver = new DBDriverProtocol()
			assert.strictEqual(await driver.delete('/file'), undefined)
		})

		it('delegates to inner driver', async () => {
			const inner = new DBDriverProtocol()
			inner.delete = async () => true
			const outer = new DBDriverProtocol({ driver: inner })
			assert.strictEqual(await outer.delete('/file'), true)
		})
	})

	describe('listDir', () => {
		it('returns empty array by default', async () => {
			const driver = new DBDriverProtocol()
			assert.deepStrictEqual(await driver.listDir('/dir/'), [])
		})
	})

	describe('from', () => {
		it('returns same instance if already DBDriverProtocol', () => {
			const driver = new DBDriverProtocol()
			assert.strictEqual(DBDriverProtocol.from(driver), driver)
		})

		it('creates new instance from config object', () => {
			const driver = DBDriverProtocol.from({ cwd: '/x' })
			assert.ok(driver instanceof DBDriverProtocol)
			assert.strictEqual(driver.cwd, '/x')
		})
	})

	describe('Formats', () => {
		it('loaders parse JSON', () => {
			const loader = DBDriverProtocol.Formats.loaders[0]
			const result = loader('{"a":1}', '.json')
			assert.deepStrictEqual(result, { a: 1 })
		})

		it('loaders return false for non-JSON', () => {
			const loader = DBDriverProtocol.Formats.loaders[0]
			assert.strictEqual(loader('text', '.txt'), false)
		})

		it('loaders raw fallback returns string', () => {
			const fallback = DBDriverProtocol.Formats.loaders[DBDriverProtocol.Formats.loaders.length - 1]
			assert.strictEqual(fallback('raw text'), 'raw text')
		})

		it('savers stringify JSON', () => {
			const saver = DBDriverProtocol.Formats.savers[0]
			assert.strictEqual(saver({ a: 1 }, '.json'), '{"a":1}')
		})

		it('savers return false for non-JSON', () => {
			const saver = DBDriverProtocol.Formats.savers[0]
			assert.strictEqual(saver('text', '.txt'), false)
		})

		it('savers fallback stringifies anything', () => {
			const fallback = DBDriverProtocol.Formats.savers[DBDriverProtocol.Formats.savers.length - 1]
			assert.strictEqual(fallback(42), '42')
		})
	})
})
