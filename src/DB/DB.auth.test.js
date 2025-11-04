import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import DB from './DB.js'
import DBDriverProtocol from './DriverProtocol.js'

class TestAuthDriver extends DBDriverProtocol {
	constructor(permissions = {}) {
		super()
		this.permissions = permissions
	}

	async ensure(uri, level, context = {}) {
		const { role = 'guest' } = context

		if (this.permissions[role] && this.permissions[role][level]) {
			const allowed = this.permissions[role][level]
			if (Array.isArray(allowed)) {
				const isAllowed = allowed.some(pattern => {
					if (pattern.endsWith('*')) {
						return uri.startsWith(pattern.slice(0, -1))
					}
					return uri === pattern
				})
				if (!isAllowed) {
					return { granted: false }
				}
			}
		}

		return { granted: true }
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
		
		const context = { role: 'user' }
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
		
		const context = { role: 'user' }
		
		await assert.rejects(
			async () => {
				await db.get('secret/data.json', {}, context)
			},
			{
				message: 'Access denied to secret/data.json (level: r)'
			}
		)
	})

	it('should allow write access to permitted paths', async () => {
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
		
		const context = { role: 'user' }
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
		
		const context = { role: 'user' }
		
		await assert.rejects(
			async () => {
				await db.set('public/info.txt', 'Public info', context)
			},
			{
				message: 'Access denied to public/info.txt (level: w)'
			}
		)
	})

	it('should deny delete access when not permitted', async () => {
		const permissions = {
			user: {
				r: ['*'],
				w: ['*'],
				d: []
			}
		}
		
		const db = new DB({
			driver: new TestAuthDriver(permissions)
		})
		
		await db.connect()
		
		const context = { role: 'user' }
		
		await assert.rejects(
			async () => {
				await db.dropDocument('any/file.txt', context)
			},
			{
				message: 'Access denied to any/file.txt (level: d)'
			}
		)
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
		
		const context = { role: 'admin' }
		
		// This should not throw
		const result = await db.dropDocument('any/file.txt', context)
		// dropDocument returns false in base implementation
		assert.equal(result, false)
	})

	it('should work with default guest role', async () => {
		const permissions = {
			guest: {
				r: ['public/*'],
				w: [],
				d: []
			}
		}
		
		const db = new DB({
			driver: new TestAuthDriver(permissions)
		})
		
		await db.connect()
		
		const context = {} // No role specified, should default to 'guest'
		
		// Should allow reading public files after they are set
		await db.set('public/info.txt', 'Public info')
		const result = await db.get('public/info.txt', {}, context)
		assert.equal(result, 'Public info')
		
		// Should deny writing
		await assert.rejects(
			async () => {
				await db.set('private/data.txt', 'Private data', context)
			},
			{
				message: 'Access denied to private/data.txt (level: w)'
			}
		)
	})
})