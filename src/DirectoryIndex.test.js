import { suite, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import DirectoryIndex from './DirectoryIndex.js'
import DocumentStat from './DocumentStat.js'

suite('DirectoryIndex', () => {
	describe('constructor', () => {
		it('should create instance with default values', () => {
			const index = new DirectoryIndex()
			assert.deepStrictEqual(index.entries, [])
			assert.deepStrictEqual(index.entriesColumns, [])
			assert.strictEqual(index.entriesAs, DirectoryIndex.ENTRIES_AS_ARRAY)
			assert.strictEqual(index.maxEntriesOnLoad, 12)
		})

		it('should initialize from input object', () => {
			const entries = [['file1.txt'], ['file2.txt']]
			const entriesColumns = ['name', 'mtimeMs.36', 'size']
			const entriesAs = DirectoryIndex.ENTRIES_AS_ROWS
			const maxEntriesOnLoad = 33
			const filter = {}

			const index = new DirectoryIndex({
				entries,
				entriesColumns,
				entriesAs,
				maxEntriesOnLoad,
				filter
			})

			assert.deepStrictEqual(index.entries, entries)
			assert.deepStrictEqual(index.entriesColumns, entriesColumns)
			assert.strictEqual(index.entriesAs, entriesAs)
			assert.strictEqual(index.maxEntriesOnLoad, maxEntriesOnLoad)
		})
	})

	describe('getters', () => {
		it('should return static values', () => {
			const index = new DirectoryIndex()
			assert.strictEqual(index.ENTRIES_AS_ARRAY, 'array')
			assert.strictEqual(index.ENTRIES_AS_OBJECT, 'object')
			assert.strictEqual(index.ENTRIES_AS_ROWS, 'rows')
			assert.strictEqual(index.ENTRIES_AS_TEXT, 'text')
			assert.deepStrictEqual(index.ENTRIES_AS_ALL, ['array', 'object', 'rows', 'text'])
		})
	})

	describe('encodeComponent', () => {
		it('should encode string components', () => {
			const index = new DirectoryIndex()
			assert.strictEqual(index.encodeComponent('test file'), 'test%20file')
			assert.strictEqual(index.encodeComponent('file.txt'), 'file.txt')
		})
	})

	describe('encodeIntoArray', () => {
		it('should throw error when entriesColumns has less than 2 elements', () => {
			const index = new DirectoryIndex({ entriesColumns: ['name'] })
			const entries = [['file.txt', new DocumentStat({ mtimeMs: 999, size: 100 })]]

			assert.throws(() => index.encodeIntoArray(entries), TypeError)
		})

		it('should throw error when entriesColumns missing name column', () => {
			const index = new DirectoryIndex({ entriesColumns: ['mtimeMs', 'size'] })
			const entries = [['file.txt', new DocumentStat({ mtimeMs: 999, size: 100 })]]

			assert.throws(() => index.encodeIntoArray(entries), TypeError)
		})

		it('should throw error when entriesColumns missing mtimeMs column', () => {
			const index = new DirectoryIndex({ entriesColumns: ['name', 'size'] })
			const entries = [['file.txt', new DocumentStat({ mtimeMs: 999, size: 100 })]]

			assert.throws(() => index.encodeIntoArray(entries), TypeError)
		})

		it('should encode entries as array with specified columns', () => {
			const index = new DirectoryIndex({
				entriesColumns: ['name', 'mtimeMs.36', 'size']
			})
			const stat = new DocumentStat({ mtimeMs: 999, size: 100 })
			const entries = [['file.txt', stat]]

			const result = index.encodeIntoArray(entries)
			assert.deepStrictEqual(result, [['file.txt', 'rr', '100']])
		})

		it('should throw error for incorrect radix', () => {
			const index = new DirectoryIndex({
				entriesColumns: ['name', 'mtimeMs.1', 'size']
			})
			const stat = new DocumentStat({ mtimeMs: 999, size: 100 })
			const entries = [['file.txt', stat]]

			assert.throws(() => index.encodeIntoArray(entries), TypeError)
		})
	})

	describe('encodeIntoRows', () => {
		it('should encode entries as rows with default divider', () => {
			const index = new DirectoryIndex({
				entriesColumns: ['name', 'mtimeMs.36', 'size']
			})
			const stat = new DocumentStat({ mtimeMs: 999, size: 100 })
			const entries = [['file.txt', stat]]

			const result = index.encodeIntoRows(entries)
			assert.deepStrictEqual(result, ['file.txt rr 100'])
		})

		it('should encode entries as rows with custom divider', () => {
			const index = new DirectoryIndex({
				entriesColumns: ['name', 'mtimeMs.36', 'size']
			})
			const stat = new DocumentStat({ mtimeMs: 999, size: 100 })
			const entries = [['file.txt', stat]]

			const result = index.encodeIntoRows(entries, ',')
			assert.deepStrictEqual(result, ['file.txt,rr,100'])
		})
	})

	describe('encode', () => {
		it('should encode as array', () => {
			const index = new DirectoryIndex({
				entriesColumns: ['name', 'mtimeMs.36', 'size'],
				entriesAs: DirectoryIndex.ENTRIES_AS_ARRAY
			})
			const stat = new DocumentStat({ mtimeMs: 999, size: 100 })
			const entries = [['file.txt', stat]]

			const result = index.encode(entries)
			assert.deepStrictEqual(result, [['file.txt', 'rr', '100']])
		})

		it('should encode as rows', () => {
			const index = new DirectoryIndex({
				entriesColumns: ['name', 'mtimeMs.36', 'size'],
				entriesAs: DirectoryIndex.ENTRIES_AS_ROWS
			})
			const stat = new DocumentStat({ mtimeMs: 999, size: 100 })
			const entries = [['file.txt', stat]]

			const result = index.encode(entries)
			assert.deepStrictEqual(result, ['file.txt rr 100'])
		})

		it('should encode as text', () => {
			const index = new DirectoryIndex({
				entriesColumns: ['name', 'mtimeMs.36', 'size.36'],
				entriesAs: DirectoryIndex.ENTRIES_AS_TEXT
			})
			const stat = new DocumentStat({ mtimeMs: 999, size: 100 })
			const entries = [['file.txt', stat]]

			const result = index.encode(entries)
			assert.strictEqual(result, 'file.txt rr 2s')
		})

		it('should return entries as-is for object format', () => {
			const index = new DirectoryIndex({
				entriesAs: DirectoryIndex.ENTRIES_AS_OBJECT
			})
			const entries = [['file.txt', new DocumentStat()]]

			const result = index.encode(entries)
			assert.deepStrictEqual(result, entries)
		})
	})

	describe('decode', () => {
		it('should decode text format', () => {
			const index = new DirectoryIndex({
				entriesColumns: ['mtimeMs.36', 'size', 'name']
			})
			const source = 'mecvlwg9 100 file.txt'

			const result = index.decode(source, DirectoryIndex.ENTRIES_AS_TEXT)
			assert.ok(Array.isArray(result))
			assert.strictEqual(result.length, 1)
			assert.strictEqual(result[0][0], 'file.txt')
			// assert.equal(result[0][])
			assert.ok(result[0][1] instanceof DocumentStat)
			const map = new Map(result)
			const stat = map.get("file.txt")
			assert.equal(stat.mtimeMs, parseInt("mecvlwg9", 36))
			assert.equal(stat.size, 100)
		})

		it('should decode rows format', () => {
			const index = new DirectoryIndex({
				entriesColumns: ['name', 'mtimeMs.36', 'size']
			})
			const source = ['file.txt mecvlwg9 100']

			const result = index.decode(source, DirectoryIndex.ENTRIES_AS_ROWS)
			assert.ok(Array.isArray(result))
			assert.strictEqual(result.length, 1)
			assert.strictEqual(result[0][0], 'file.txt')
			assert.ok(result[0][1] instanceof DocumentStat)
		})

		it('should decode array format', () => {
			const index = new DirectoryIndex({
				entriesColumns: ['name', 'mtimeMs.36', 'size']
			})
			const source = [['file.txt', 'mecvlwg9', '100']]

			const result = index.decode(source)
			assert.ok(Array.isArray(result))
			assert.strictEqual(result.length, 1)
			assert.strictEqual(result[0][0], 'file.txt')
			assert.ok(result[0][1] instanceof DocumentStat)
		})

		it('should return source as-is for object format', () => {
			const index = new DirectoryIndex({
				entriesAs: DirectoryIndex.ENTRIES_AS_OBJECT
			})
			const source = [['file.txt', new DocumentStat()]]

			const result = index.decode(source)
			assert.deepStrictEqual(result, source)
		})

		it('should throw error when decoding non-array source as array format', () => {
			const index = new DirectoryIndex({
				entriesColumns: ['name', 'mtimeMs.36', 'size'],
				entriesAs: DirectoryIndex.ENTRIES_AS_ARRAY
			})
			const source = 'not an array'

			assert.throws(() => index.decode(source), TypeError)
		})
	})

	describe('from', () => {
		it('should return existing instance if DirectoryIndex', () => {
			const existing = new DirectoryIndex()
			const result = DirectoryIndex.from(existing)
			assert.strictEqual(result, existing)
		})

		it('should create new instance from object', () => {
			const props = { entriesAs: DirectoryIndex.ENTRIES_AS_ROWS }
			const result = DirectoryIndex.from(props)
			assert.ok(result instanceof DirectoryIndex)
			assert.strictEqual(result.entriesAs, DirectoryIndex.ENTRIES_AS_ROWS)
		})
	})
})
