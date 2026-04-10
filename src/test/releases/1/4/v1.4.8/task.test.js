import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// Імпортуємо сутності безпосередньо з нових точок доступу
import * as DomainIndex from '../../../../../domain/index.js'
import DB, { DBDriverProtocol } from '../../../../../index.js'

describe('v1.4.8: Domain Export & Types Refinement', () => {
	it('should gracefully export Domain models from src/domain/index.js', () => {
		// Перевірка наявності експортованих класів моделей
		assert.ok(DomainIndex.DBConfig, 'DBConfig must be exported')
		assert.ok(DomainIndex.RevisionInfo, 'RevisionInfo must be exported')

		// Перевірка інстанціації
		const config = new DomainIndex.DBConfig({ protocol: 'memory' })
		assert.equal(config.protocol, 'memory')
		
		const revision = new DomainIndex.RevisionInfo({ message: 'chore: test' })
		assert.equal(revision.message, 'chore: test')
	})

	it('should support legacy default export for cross-package compatibility', () => {
		assert.ok(DB, 'Default export DB must exist')
		assert.equal(typeof DB.prototype.get, 'function', 'Default export must be DB class')
	})

	it('should safely export class DBDriverProtocol without JSDoc collision', () => {
		assert.ok(DBDriverProtocol, 'DBDriverProtocol class must be exported')
		assert.equal(typeof DBDriverProtocol.prototype.read, 'function')
	})
})
