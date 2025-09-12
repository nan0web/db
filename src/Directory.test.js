import { suite, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import Directory from './Directory.js'

suite('Directory', () => {
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
})
