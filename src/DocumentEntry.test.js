import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import DocumentEntry from './DocumentEntry.js'
import DocumentStat from './DocumentStat.js'

describe('DocumentEntry', () => {
	it('should create instance with default values', () => {
		const entry = new DocumentEntry()
		assert.strictEqual(entry.name, '')
		assert.strictEqual(entry.depth, 0)
		assert.strictEqual(entry.path, '')
		assert.strictEqual(entry.parent, '')
		assert.strictEqual(entry.isDirectory, false)
		assert.strictEqual(entry.isFile, false)
		assert.strictEqual(entry.fulfilled, false)
		assert.strictEqual(entry.isSymbolicLink, false)
	})

	it('should set properties from constructor', () => {
		const stat = new DocumentStat({ size: 100, isFile: true })
		const entry = new DocumentEntry({
			name: 'test.txt',
			stat,
			depth: 1,
			path: '/path/to/test.txt',
			parent: '/path/to',
			fulfilled: true
		})

		assert.strictEqual(entry.name, 'test.txt')
		assert.strictEqual(entry.stat.size, 100)
		assert.strictEqual(entry.depth, 1)
		assert.strictEqual(entry.path, '/path/to/test.txt')
		assert.strictEqual(entry.parent, '/path/to')
		assert.strictEqual(entry.isFile, true)
		assert.strictEqual(entry.isDirectory, false)
		assert.strictEqual(entry.fulfilled, true)
	})

	it('should extract name from path if not provided', () => {
		const entry = new DocumentEntry({ path: '/path/to/file.txt' })
		assert.strictEqual(entry.name, 'file.txt')
	})

	it('should create from existing instance', () => {
		const original = new DocumentEntry({ name: 'test' })
		const copy = DocumentEntry.from(original)
		assert.strictEqual(copy.name, 'test')
		assert.strictEqual(copy, original)
	})

	it('should create from plain object', () => {
		const entry = DocumentEntry.from({ path: 'test/dir/file.txt' })
		assert.equal(entry.name, 'file.txt')
		assert.equal(entry.depth, 3)
		assert.ok(entry instanceof DocumentEntry)
	})
})
