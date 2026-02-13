#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { Logger } from '@nan0web/log'

import { DB, DBDriverProtocol } from '../src/index.js'
import { pressAnyKey } from './simple-demos.js'
import { tabbed } from './utils/index.js'

// Authorization driver example
class AuthDriver extends DBDriverProtocol {
	constructor(permissions = {}) {
		super()
		this.permissions = permissions
	}

	async ensure(uri, level, context = {}) {
		const { user = {}, role = 'guest' } = context

		// Check explicit permissions
		if (this.permissions[role] && this.permissions[role][level]) {
			const allowed = this.permissions[role][level]
			if (Array.isArray(allowed)) {
				const isAllowed = allowed.some((pattern) => {
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

		// Default allow for all access
		return { granted: true }
	}
}

/**
 *
 * @param {Logger} console
 */
export async function runAuthDemo(console) {
	console.clear()
	console.success('Authorization Demo')

	// Create temporary directory for demo
	const demoDir = path.join(process.cwd(), 'tmp-auth-demo')
	if (!fs.existsSync(demoDir)) {
		fs.mkdirSync(demoDir, { recursive: true })
	}

	// Setup authorization rules
	const permissions = {
		admin: {
			r: ['*'], // Read all
			w: ['*'], // Write all
			d: ['*'], // Delete all
		},
		user: {
			r: ['public/*', 'shared/*'], // Read only public and shared
			w: ['users/*/profile.json'], // Write only own profile
			d: [], // No delete permissions
		},
		guest: {
			r: ['public/*'], // Read only public
			w: [], // No write permissions
			d: [], // No delete permissions
		},
	}

	// Create DB with auth driver
	const db = new DB({
		cwd: demoDir,
		driver: new AuthDriver(permissions),
		console: console,
	})

	// FS driver methods
	db.loadDocument = async function (uri, defaultValue = undefined) {
		const filePath = path.join(this.cwd, uri)
		try {
			if (fs.existsSync(filePath)) {
				const content = fs.readFileSync(filePath, 'utf8')
				if (this.extname(uri) === '.json') {
					return JSON.parse(content)
				}
				return content
			}
		} catch (error) {
			this.console.warn(`Failed to load document: ${uri}`, error.message)
		}
		return defaultValue
	}

	db.saveDocument = async function (uri, document) {
		const filePath = path.join(this.cwd, uri)
		const dirPath = path.dirname(filePath)

		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true })
		}

		if (typeof document === 'object') {
			fs.writeFileSync(filePath, JSON.stringify(document, null, 2))
		} else {
			fs.writeFileSync(filePath, String(document))
		}

		return true
	}

	db.dropDocument = async function (uri) {
		const filePath = path.join(this.cwd, uri)
		try {
			fs.unlinkSync(filePath)
			return true
		} catch (error) {
			return false
		}
	}

	await db.connect()

	console.info('Authorization DB connected:')
	console.info(`• Working directory: ${demoDir}`)
	console.info(`• Using AuthDriver with permissions:\n`)

	const table = Object.entries(permissions).map(([group, perm]) => [
		group,
		perm.r.join(', '),
		perm.w.join(', '),
		perm.d.join(', '),
	])
	console.table(table, ['Group', 'r (Read)', 'w (Write)', 'd (Delete)'], {
		border: 1,
		headBorder: 1,
		padding: 3,
		aligns: ['l', 'c', 'c'],
	})
	// console.info(tabbed(JSON.stringify(permissions, null, 2)))

	await pressAnyKey(console)

	// Demo: Admin access
	console.info('\n1. Admin user access:')
	try {
		const adminContext = { role: 'admin' }
		await db.set('secret/data.json', { password: 'admin123' }, adminContext)
		const data = await db.get('secret/data.json', {}, adminContext)
		console.info(tabbed(`Admin can access secret/data.json: ${JSON.stringify(data)}`))
	} catch (error) {
		console.info(tabbed(`Admin access failed: ${error.message}`))
	}

	await pressAnyKey(console)

	// Demo: User access to allowed resources
	console.info('\n2. Regular user permissions:')
	try {
		const userContext = { role: 'user' }

		// This should work - user can read public files
		await db.set('public/info.txt', 'Public information', userContext)
		const publicData = await db.get('public/info.txt', {}, userContext)
		console.info(tabbed(`User can read public/info.txt: "${publicData}"`))

		// This should work - user can write own profile
		const userProfile = { name: 'John', preferences: { theme: 'dark' } }
		await db.set('users/john/profile.json', userProfile, userContext)
		const profile = await db.get('users/john/profile.json', {}, userContext)
		console.info(tabbed(`User can write own profile: ${JSON.stringify(profile)}`))
	} catch (error) {
		console.info(tabbed(`User access partially failed: ${error.message}`))
	}

	await pressAnyKey(console)

	// Demo: User forbidden access
	console.info('\n3. User forbidden operations:')
	try {
		const userContext = { role: 'user' }

		// This should fail - user cannot access secret files
		await db.get('secret/data.json', {}, userContext)
		console.info(tabbed('ERROR: User accessed secret file (should not happen)'))
	} catch (error) {
		console.info(tabbed(`User correctly denied access to secret/data.json: ${error.message}`))
	}

	try {
		// This should fail - user cannot delete files
		await db.dropDocument('public/info.txt', userContext)
		console.info(tabbed('ERROR: User deleted file (should not happen)'))
	} catch (error) {
		console.info(tabbed(`User correctly denied delete access: ${error.message}`))
	}

	await pressAnyKey(console)

	// Demo: Guest access restrictions
	console.info('\n4. Guest user restrictions:')
	try {
		const guestContext = { role: 'guest' }

		// This should work - guest can read public files
		const publicData = await db.get('public/info.txt', {}, guestContext)
		console.info(tabbed(`Guest can read public/info.txt: "${publicData}"`))

		// This should fail - guest cannot write files
		await db.set('guest/test.txt', 'Test', guestContext)
		console.info(tabbed('ERROR: Guest wrote file (should not happen)'))
	} catch (error) {
		console.info(tabbed(`Guest correctly denied write access: ${error.message}`))
	}

	await pressAnyKey(console)

	// Cleanup
	console.info('\n5. Cleaning up demo files:')
	fs.rmSync(demoDir, { recursive: true, force: true })
	console.info(tabbed(`Removed demo directory: ${demoDir}`))

	console.success('\nAuthorization demo complete! 🔐')
}
