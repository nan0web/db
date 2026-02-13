import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import AuthContext from './AuthContext.js'

describe('AuthContext', () => {
	it('should create instance without errors', () => {
		const context = new AuthContext()
		assert.ok(context instanceof AuthContext)
	})

	it('should add fail error messages', () => {
		const context = new AuthContext()
		context.fail(new Error('No access'))
		context.fail(new Error('Access denied'))
		assert.equal(context.fails.length, 2)
	})
})
