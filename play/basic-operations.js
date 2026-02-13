#!/usr/bin/env node

import { DB, GetOptions } from '../src/index.js'
import { pressAnyKey } from './simple-demos.js'

export async function runBasicOperationsDemo(console) {
	console.clear()
	console.success('Basic DB Operations Demo')

	// Create in-memory DB with predefined data
	const db = new DB({
		console: console,
		predefined: [
			['hello.txt', 'Hello, Universe!'],
			['config.json', { theme: 'dark', lang: 'en' }],
		],
	})
	await db.connect()

	console.info('DB connected with predefined files:\n')
	console.info("• hello.txt → 'Hello, Universe!'")
	console.info("• config.json → { theme: 'dark', lang: 'en' }\n")

	await pressAnyKey(console)

	// Demo: get document
	console.info("1. Getting 'hello.txt':")
	const hello = await db.get('hello.txt')
	console.info(`   Result: ${JSON.stringify(hello)}`)

	await pressAnyKey(console)

	// Demo: get with default value
	console.info('\n2. Getting missing file with default:')
	const opts = new GetOptions({ defaultValue: 'Default content' })
	const missing = await db.get('missing.md', opts)
	console.info(`   Result: ${JSON.stringify(missing)}`)

	await pressAnyKey(console)

	// Demo: set new document
	console.info("\n3. Setting new document 'user.json':")
	const userData = { name: 'NanoCoder', role: 'Creator' }
	await db.set('user.json', userData)
	const newUser = db.data.get('user.json')
	console.info(`   Saved: ${JSON.stringify(newUser)}`)
	console.info(`   In DB data: ${JSON.stringify(db.data.get('user.json'))}`)

	await pressAnyKey(console)

	// Demo: stat document
	console.info("\n4. Getting stats for 'config.json':")
	const stat = await db.stat('config.json')
	console.info(`   Size: ${stat.size} bytes`)
	console.info(`   Modified: ${stat.mtime.toISOString()}`)
	console.info(`   Exists: ${stat.exists}`)

	await pressAnyKey(console)

	// Demo: push (simulated sync)
	console.info('\n5. Pushing changes to storage:')
	const changed = await db.push()
	console.info(`   Changed URIs: ${JSON.stringify(changed)}`)
	console.info('   (In memory DB - simulates sync, no real files)')

	console.success('\nBasic operations demo complete! 📦')
}
