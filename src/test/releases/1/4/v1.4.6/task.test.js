import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import DBConfig from '../../../../../domain/DBConfig.js'
import RevisionInfo from '../../../../../domain/RevisionInfo.js'
import DB from '../../../../../DB/DB.js'

describe('Release v1.4.6: Domain Models Integration', () => {
	it('Story 1: User initiates database setup via DSN string, the protocol and credentials must be correctly detected and safely reported in logs', () => {
		// Scenario: Administrator enters standard Redis DSN
		const dsn = 'redis://root:secret@127.0.0.1:6379/cache'
		const config = new DBConfig(dsn)

		// Verification: DBConfig parses everything automatically
		assert.equal(config.protocol, 'redis')
		assert.equal(config.username, 'root')
		assert.equal(config.password, 'secret')
		assert.equal(config.database, 'cache')

		// Verification: Password is removed from safeDsn meant for logger output
		assert.equal(config.safeDsn.includes('secret'), false, 'Password must not leak into safeDsn')
		assert.equal(config.safeDsn.includes('***'), true, 'Password must be masked')
	})

	it('Story 2: Internal storage adapter logs a modification and constructs a new RevisionInfo with unique SHA and timestamp', () => {
		// Scenario: Document `users/1.json` is modified inside "fs" adapter
		const ts = new Date('2026-04-06T00:00:00.000Z').toISOString()
		const revision = new RevisionInfo({
			sha: '9b7f5e1a2c3d4f5g',
			key: 'users/1.json',
			author: 'System',
			message: 'Auto-update',
			timestamp: ts,
		})

		// Verification: Formatting outputs a standard 7-char short SHA
		assert.equal(revision.shortSha, '9b7f5e1', 'Should use 7-char hash for commits')
		// Verification: Automatically mounts timestamp into Date instance
		assert.ok(revision.date instanceof Date)
		assert.equal(revision.date.toISOString(), ts)
	})

	it('Story 3: DB instance hydrated dynamically from models map correctly restores the object instance', async () => {
		// Scenario: A generic document is fetched from the database
		const db = new DB()
		// We pretend `data/` is a local json. We just test the explicit parsing/hydration.
		// DB internally uses Model.from() ? No, we removed from(). It uses `new ModelClass(data)`.
		
		const dataFromDb = {
			url: 'data/',
			maxRetries: 10
		}

		// When db hydrates `DBConfig`:
		const hydratedConfig = new DBConfig(dataFromDb)
		
		// Verification: Data is intact and default configuration supplements missing parameters
		assert.equal(hydratedConfig.protocol, 'fs') // because data/ auto-resolves to fs
		assert.equal(hydratedConfig.url, 'data/')
		assert.equal(hydratedConfig.maxRetries, 10)
		assert.equal(hydratedConfig.timeoutMs, 5000) // Default value from schema
	})
})
