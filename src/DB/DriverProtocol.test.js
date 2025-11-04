import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import DBDriverProtocol from './DriverProtocol.js'

describe('DBDriverProtocol', () => {
	it('should create instance without errors', () => {
		const driver = new DBDriverProtocol()
		assert.ok(driver instanceof DBDriverProtocol)
	})

	it('should have default methods that return expected values', async () => {
		const driver = new DBDriverProtocol()
		
		// Test connect method
		const connectResult = await driver.connect()
		assert.equal(connectResult, undefined)
		
		// Test disconnect method
		const disconnectResult = await driver.disconnect()
		assert.equal(disconnectResult, undefined)
		
		// Test access method
		const accessResult = await driver.access('test.txt', 'r')
		assert.equal(accessResult, undefined)
		
		// Test read method
		const readResult = await driver.read('test.txt', 'default')
		assert.equal(readResult, undefined)
		
		// Test write method
		const writeResult = await driver.write('test.txt', 'data')
		assert.equal(writeResult, undefined)
		
		// Test append method
		const appendResult = await driver.append('test.txt', 'chunk')
		assert.equal(appendResult, undefined)
		
		// Test stat method
		const statResult = await driver.stat('test.txt')
		assert.ok(statResult)
		assert.equal(typeof statResult, 'object')
	})

	it('should have ensure method that grants access by default', async () => {
		const driver = new DBDriverProtocol()
		const result = await driver.ensure('test.txt', 'r', {})
		assert.deepStrictEqual(result, { granted: true })
	})

	it('should deny access when ensure method is overridden', async () => {
		class DenyDriver extends DBDriverProtocol {
			async ensure(uri, level, context) {
				return { granted: false }
			}
		}
		
		const driver = new DenyDriver()
		const result = await driver.ensure('test.txt', 'r', {})
		assert.deepStrictEqual(result, { granted: false })
	})
})