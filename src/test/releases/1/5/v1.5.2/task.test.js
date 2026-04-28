import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { absolute, resolveSync } from '../../../../../../src/DB/path.js'

describe('Path Resolution Contract', () => {
	it('should confirm that absolute() forces a leading slash for virtual URI', () => {
		const cwd = 'public/data'
		const root = 'cards'
		const file = 'doc.json'

		const result = absolute(cwd, root, file)

		assert.strictEqual(result, '/public/data/cards/doc.json')
	})

	it('should confirm that resolveSync() returns a relative path from the root', () => {
		const cwd = 'public/data'
		const root = 'cards'
		const file = 'doc.json'

		const result = resolveSync(cwd, root, file)

		// resolveSync is supposed to return path relative to root
		assert.strictEqual(result, 'doc.json')
	})

	it('should correctly handle relative-to-CWD resolution for system FS', () => {
		const cwd = 'public/data'
		const root = 'cards'
		const file = 'doc.json'

		const relFromRoot = resolveSync(cwd, root, file)

		// This is how DBFS should construct the system path
		// Using a mock of path.resolve logic
		const systemPath = [cwd, root, relFromRoot].filter(Boolean).join('/')

		assert.strictEqual(systemPath, 'public/data/cards/doc.json')
		assert.strictEqual(systemPath.startsWith('/'), false)
	})
})
