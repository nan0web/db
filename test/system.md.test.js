import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('System.md examples validation', () => {
	it('Inheritance uri `/.*\\/?_$/`', () => {
		const regExp = /.*\/?_$/
		assert.ok(regExp.test('_'))
		assert.ok(regExp.test('en/_'))
		assert.ok(regExp.test('en/business/_'))
		assert.ok(regExp.test('en/business/and-more/_'))
		assert.ok(!regExp.test('en/_/langs'))
		assert.ok(!regExp.test('_/currencies'))
	})
	it('Scoping uri `/.*\/?_\/.*/`', () => {
		const regExp = /.*\/?_\/.*/
		assert.ok(!regExp.test('_'))
		assert.ok(!regExp.test('en/_'))
		assert.ok(!regExp.test('en/business/_'))
		assert.ok(regExp.test('_/business'))
		assert.ok(regExp.test('en/_/langs'))
	})
})
