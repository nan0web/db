import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import StreamEntry from './StreamEntry.js'
import DocumentEntry from './DocumentEntry.js'
import DocumentStat from './DocumentStat.js'

describe('StreamEntry', () => {
	it('should create instance with default values', () => {
		const entry = new StreamEntry()
		assert.strictEqual(entry.file.name, '')
		assert.deepStrictEqual(entry.files, [])
		assert.strictEqual(entry.dirs.size, 0)
		assert.strictEqual(entry.top.size, 0)
		assert.strictEqual(entry.errors.size, 0)
		assert.strictEqual(entry.progress, 0)
		assert.deepStrictEqual(entry.totalSize, { dirs: 0, files: 0 })
	})

	it('should set properties from constructor', () => {
		const stat = new DocumentStat({ size: 100, isFile: true })
		const file = new DocumentEntry({ name: 'test.txt', stat })
		const files = [file]
		const dirs = new Map([['dir', file]])
		const top = new Map([['top', file]])
		const errors = new Map([['error', 'message']])

		const entry = new StreamEntry({
			file,
			files,
			dirs,
			top,
			errors,
			progress: 0.5,
			totalSize: { dirs: 100, files: 200 }
		})

		assert.strictEqual(entry.file.name, 'test.txt')
		assert.strictEqual(entry.files.length, 1)
		assert.strictEqual(entry.dirs.size, 1)
		assert.strictEqual(entry.top.size, 1)
		assert.strictEqual(entry.errors.size, 1)
		assert.strictEqual(entry.progress, 0.5)
		assert.deepStrictEqual(entry.totalSize, { dirs: 100, files: 200 })
	})

	it('should convert plain objects to DocumentEntry', () => {
		const entry = new StreamEntry({
			file: { name: 'test.txt' },
			files: [{ name: 'test1.txt' }]
		})

		assert.ok(entry.file instanceof DocumentEntry)
		assert.ok(entry.files[0] instanceof DocumentEntry)
	})

	it('should handle string representations', () => {
		const fileEntry = new DocumentEntry({ name: 'file.txt', stat: { isFile: true } })
		const dirEntry = new DocumentEntry({ name: 'directory', stat: { isDirectory: true } })
		const linkEntry = new DocumentEntry({ name: 'link', stat: { isSymbolicLink: true } })

		assert.strictEqual(fileEntry.toString(), 'F file.txt')
		assert.strictEqual(dirEntry.toString(), 'D directory')
		assert.strictEqual(linkEntry.toString(), 'L link')
	})
})
