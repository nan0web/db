import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import DBConfig from './DBConfig.js'

describe('Domain: DBConfig', () => {
	it('initializes with default values', () => {
		const config = new DBConfig()
		assert.equal(config.url, 'data/')
		assert.equal(config.protocol, 'fs')
		assert.equal(config.database, '')
		assert.equal(config.maxRetries, 3)
		assert.equal(config.timeoutMs, 5000)
		assert.equal(config.safeDsn, 'data/')
	})

	it('detects protocol from URL correctly', () => {
		assert.equal(DBConfig.detectProtocol('data/'), 'fs')
		assert.equal(DBConfig.detectProtocol('redis://localhost'), 'redis')
		assert.equal(DBConfig.detectProtocol('http://localhost'), 'http')
		assert.equal(DBConfig.detectProtocol('memory://'), 'memory')
		assert.equal(DBConfig.detectProtocol(':memory:'), 'memory')
	})

	it('parses DSN correctly without modifying explicitly provided values', () => {
		// Just passing the string automatically invokes parseDsn
		const hostOnly = new DBConfig('redis://localhost:6379/db1')
		assert.equal(hostOnly.protocol, 'redis')
		assert.equal(hostOnly.database, 'db1')

		const fullDsn = new DBConfig('redis://yaro:supersecret@127.0.0.1:6379/cachedb')
		assert.equal(fullDsn.protocol, 'redis')
		assert.equal(fullDsn.username, 'yaro')
		assert.equal(fullDsn.password, 'supersecret')
		assert.equal(fullDsn.database, 'cachedb')
	})

	it('validates required fields through Model-as-Schema', () => {
		const result = DBConfig.url.validate('   ')
		assert.equal(result, 'error_db_url_required')

		const valid = DBConfig.url.validate('data/')
		assert.equal(valid, true)
	})
})
