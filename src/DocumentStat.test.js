import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import DocumentStat from './DocumentStat.js'

describe('DocumentStat', () => {
	it('should create instance with default values', () => {
		const stat = new DocumentStat()
		assert.strictEqual(stat.atimeMs, 0)
		assert.strictEqual(stat.btimeMs, 0)
		assert.strictEqual(stat.blksize, 0)
		assert.strictEqual(stat.blocks, 0)
		assert.strictEqual(stat.ctimeMs, 0)
		assert.strictEqual(stat.dev, 0)
		assert.strictEqual(stat.gid, 0)
		assert.strictEqual(stat.ino, 0)
		assert.strictEqual(stat.mode, 0)
		assert.strictEqual(stat.mtimeMs, 0)
		assert.strictEqual(stat.size, 0)
		assert.strictEqual(stat.nlink, 0)
		assert.strictEqual(stat.rdev, 0)
		assert.strictEqual(stat.uid, 0)
		assert.strictEqual(stat.isBlockDevice, false)
		assert.strictEqual(stat.isDirectory, false)
		assert.strictEqual(stat.isFile, false)
		assert.strictEqual(stat.isFIFO, false)
		assert.strictEqual(stat.isSocket, false)
		assert.strictEqual(stat.isSymbolicLink, false)
		assert.strictEqual(stat.error, null)
	})

	it('should set properties from constructor', () => {
		const stat = new DocumentStat({
			size: 100,
			isFile: true,
			mtimeMs: 1000,
			error: new Error('test error')
		})

		assert.strictEqual(stat.size, 100)
		assert.strictEqual(stat.isFile, true)
		assert.strictEqual(stat.mtimeMs, 1000)
		assert.ok(stat.error instanceof Error)
		assert.strictEqual(stat.error.message, 'test error')
	})

	it('should handle function values for type checks', () => {
		const stat = new DocumentStat({
			isFile: () => true,
			isDirectory: () => false
		})

		assert.strictEqual(stat.isFile, true)
		assert.strictEqual(stat.isDirectory, false)
	})

	it('should calculate date properties', () => {
		const now = Date.now()
		const stat = new DocumentStat({
			atimeMs: now,
			btimeMs: now,
			ctimeMs: now,
			mtimeMs: now
		})

		assert.ok(stat.atime instanceof Date)
		assert.ok(stat.btime instanceof Date)
		assert.ok(stat.ctime instanceof Date)
		assert.ok(stat.mtime instanceof Date)
		assert.strictEqual(stat.atime.getTime(), now)
		assert.strictEqual(stat.btime.getTime(), now)
		assert.strictEqual(stat.ctime.getTime(), now)
		assert.strictEqual(stat.mtime.getTime(), now)
	})

	it('should calculate exists property', () => {
		const stat1 = new DocumentStat({ blksize: 100 })
		const stat2 = new DocumentStat({ mtimeMs: 1000 })
		const stat3 = new DocumentStat()

		assert.strictEqual(stat1.exists, true)
		assert.strictEqual(stat2.exists, true)
		assert.strictEqual(stat3.exists, false)
	})

	it('should create from existing instance', () => {
		const original = new DocumentStat({ size: 100 })
		const copy = DocumentStat.from(original)
		assert.strictEqual(copy.size, 100)
		assert.strictEqual(copy, original)
	})

	it('should create from plain object', () => {
		const stat = DocumentStat.from({ size: 200 })
		assert.strictEqual(stat.size, 200)
		assert.ok(stat instanceof DocumentStat)
	})
})