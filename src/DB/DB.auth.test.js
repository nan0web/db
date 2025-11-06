import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import DB from './DB.js'
import DBDriverProtocol from './DriverProtocol.js'
import AuthContext from './AuthContext.js'

function matches(uri, pattern) {
	if (pattern === '*') return true
	pattern = pattern.trim()
	if (pattern.endsWith('*')) {
		const prefix = pattern.slice(0, -1)
		return uri.startsWith(prefix)
	}
	const p = pattern.split('/')
	const u = uri.split('/')
	if (p.length !== u.length) return false
	for (let i = 0; i < p.length; i++) {
		if (p[i] === '*' || p[i] === u[i]) continue
		return false
	}
	return true
}

class TestAuthDriver extends DBDriverProtocol {
	constructor(permissions = {}) {
		super()
		this.permissions = permissions
	}

	async access(uri, level, contextInput) {
		const context = AuthContext.from(contextInput)
		const role = context.role || 'guest'

		if (this.permissions[role] && this.permissions[role][level]) {
			const allowed = this.permissions[role][level]
			const isAllowed = allowed.some(pattern => matches(uri, pattern))
			if (allowed.length === 0 || !isAllowed) {
				return false
			}
		}

		return true
	}
}

describe('DB Authorization', () => {
	it('should allow access with permissive driver', async () => {
		const permissions = {
			user: {
				r: ['*'],
				w: ['*'],
				d: ['*']
			}
		}

		const db = new DB({
			driver: new TestAuthDriver(permissions),
			predefined: [['test.json', { data: 'test' }]]
		})

		await db.connect()

		const context = new AuthContext({ role: 'user' })
		const result = await db.get('test.json', {}, context)
		assert.deepStrictEqual(result, { data: 'test' })
	})

	it('should deny access with restrictive driver', async () => {
		const permissions = {
			user: {
				r: ['public/*'],
				w: ['users/*/profile.json'],
				d: []
			}
		}

		const db = new DB({
			driver: new TestAuthDriver(permissions),
			predefined: [['secret/data.json', { password: 'secret123' }]]
		})

		await db.connect()

		const context = new AuthContext({ role: 'user' })

		await assert.rejects(
			async () => {
				await db.get('secret/data.json', {}, context)
			},
			{
				message: 'Access denied to secret/data.json { level: r }'
			}
		)
	})

	it('should allow write access to permitted paths', async () => {
		const permissions = {
			user: {
				r: ['public/*', 'users/*/profile.json'],
				w: ['users/*/profile.json'],
				d: []
			}
		}

		const db = new DB({
			driver: new TestAuthDriver(permissions)
		})

		await db.connect()

		const context = new AuthContext({ role: 'user' })
		const userProfile = { name: 'John', theme: 'dark' }

		// This should not throw
		await db.set('users/john/profile.json', userProfile, context)

		const result = await db.get('users/john/profile.json', {}, context)
		assert.deepStrictEqual(result, userProfile)
	})

	it('should deny write access to forbidden paths', async () => {
		const permissions = {
			user: {
				r: ['public/*'],
				w: ['users/*/profile.json'],
				d: []
			}
		}

		const db = new DB({
			driver: new TestAuthDriver(permissions)
		})

		await db.connect()

		const context = new AuthContext({ role: 'user' })

		await assert.rejects(
			async () => {
				await db.set('public/info.txt', 'Public info', context)
			},
			{
				message: 'Access denied to public/info.txt { level: w }'
			}
		)
	})

	it('should deny delete access when not permitted # TODO', async () => {
		// TODO: Implement test after driver adjustments
		assert(true)
	})

	it('should allow delete access when permitted', async () => {
		const permissions = {
			admin: {
				r: ['*'],
				w: ['*'],
				d: ['*']
			}
		}

		const db = new DB({
			driver: new TestAuthDriver(permissions)
		})

		await db.connect()

		const context = new AuthContext({ role: 'admin' })

		// This should not throw, because access is
		const result = await db.dropDocument('any/file.txt', context)
		assert.equal(result, true)
	})

	it('should work with default guest role', async () => {
		const permissions = {
			guest: {
				r: ['public/*'],
				w: ['public/*'],
				d: []
			}
		}

		const db = new DB({
			driver: new TestAuthDriver(permissions)
		})

		await db.connect()

		const context = new AuthContext({})

		// Should allow writing public files
		await db.set('public/info.txt', 'Public info')
		const result = await db.get('public/info.txt', {}, context)
		assert.equal(result, 'Public info')

		// Should deny writing private
		await assert.rejects(
			async () => {
				await db.set('private/data.txt', 'Private data', context)
			},
			{
				message: 'Access denied to private/data.txt { level: w }'
			}
		)
	})
})
