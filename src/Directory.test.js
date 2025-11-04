import { suite, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import Directory from './Directory.js'

suite('Directory', () => {
	describe('Static Properties', () => {
		it('should have correct default constants', () => {
			assert.strictEqual(Directory.FILE, '_')
			assert.strictEqual(Directory.GLOBALS, '_/')
			assert.strictEqual(Directory.INDEX, 'index')
			assert.deepStrictEqual(Directory.DATA_EXTNAMES, [".json", ".yaml", ".yml", ".nano", ".csv", ".md"])
		})
	})

	describe('isGlobal', () => {
		it('should return true for paths starting with GLOBALS prefix', () => {
			assert.strictEqual(Directory.isGlobal('_/langs'), true)
			assert.strictEqual(Directory.isGlobal('_/tags'), true)
			assert.strictEqual(Directory.isGlobal('_/'), true)
		})

		it('should return true for included GLOBALS prefix', () => {
			assert.strictEqual(Directory.isGlobal('uk/_/langs'), true)
			assert.strictEqual(Directory.isGlobal('uk/_/tags'), true)
			assert.strictEqual(Directory.isGlobal('uk/_/'), true)
		})

		it('should return false for paths not starting with GLOBALS prefix', () => {
			assert.strictEqual(Directory.isGlobal('langs'), false)
			assert.strictEqual(Directory.isGlobal('tags'), false)
			assert.strictEqual(Directory.isGlobal('contacts'), false)
			assert.strictEqual(Directory.isGlobal(''), false)
		})

		it('should return false for paths with different prefix', () => {
			assert.strictEqual(Directory.isGlobal('g/'), false)
			assert.strictEqual(Directory.isGlobal('globals/'), false)
			assert.strictEqual(Directory.isGlobal('_global/'), false)
		})
	})

	describe('getGlobalName', () => {
		it('should extract global variable name correctly', () => {
			assert.equal(Directory.getGlobalName('_/langs'), 'langs')
			assert.equal(Directory.getGlobalName('_/langs.yaml'), 'langs')
			assert.equal(Directory.getGlobalName('_/langs.json'), 'langs')
			assert.equal(Directory.getGlobalName('_/sub/folder.json'), 'folder')
		})

		it('should return empty string for non-global paths', () => {
			assert.equal(Directory.getGlobalName('langs'), '')
			assert.equal(Directory.getGlobalName('langs.yaml'), '')
			assert.equal(Directory.getGlobalName('langs.json'), '')
			assert.equal(Directory.getGlobalName('sub/folder.json'), '')
		})

		it('should extract global variable name from nested paths', () => {
			assert.equal(Directory.getGlobalName('sub/_/langs'), 'langs')
			assert.equal(Directory.getGlobalName('sub/_/langs.yaml'), 'langs')
			assert.equal(Directory.getGlobalName('sub/_/langs.json'), 'langs')
		})

		it('should handle edge cases', () => {
			assert.equal(Directory.getGlobalName('_/'), '')
			assert.equal(Directory.getGlobalName('_/index.txt'), '')
			assert.equal(Directory.getGlobalName('sub/_/'), '')
			assert.equal(Directory.getGlobalName(null), '')
			assert.equal(Directory.getGlobalName(undefined), '')
		})
	})

	describe('isRoot', () => {
		it('should return true for root paths', () => {
			assert.strictEqual(Directory.isRoot('.'), true)
			assert.strictEqual(Directory.isRoot('/'), true)
			assert.strictEqual(Directory.isRoot('./'), true)
			assert.strictEqual(Directory.isRoot(''), true)
		})

		it('should return false for non-root paths', () => {
			assert.strictEqual(Directory.isRoot('folder'), false)
			assert.strictEqual(Directory.isRoot('/folder'), false)
			assert.strictEqual(Directory.isRoot('dir/'), false)
		})
	})

	describe('isDirectory', () => {
		it('should return true for directory paths ending with slash', () => {
			assert.strictEqual(Directory.isDirectory('folder/'), true)
			assert.strictEqual(Directory.isDirectory('path/to/folder/'), true)
			assert.strictEqual(Directory.isDirectory('/'), true)
		})

		it('should return false for file paths not ending with slash', () => {
			assert.strictEqual(Directory.isDirectory('file.txt'), false)
			assert.strictEqual(Directory.isDirectory('path/to/file.json'), false)
			assert.strictEqual(Directory.isDirectory(''), false)
			assert.strictEqual(Directory.isDirectory('noextension'), false)
		})

		it('should handle edge cases', () => {
			assert.strictEqual(Directory.isDirectory(null), false)
			assert.strictEqual(Directory.isDirectory(undefined), false)
			assert.strictEqual(Directory.isDirectory(123), false)
		})
	})

	describe('entries', () => {
		it('should return an empty array', () => {
			const directory = new Directory()
			assert.deepStrictEqual(directory.entries, [])
		})
	})

	describe('entriesFn', () => {
		it('should return a function that returns an empty array', () => {
			const directory = new Directory()
			assert.deepStrictEqual(directory.entriesFn(), [])
		})
	})
})