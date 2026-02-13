#!/usr/bin/env node

import { DB, Data } from '../src/index.js'
import { next } from '@nan0web/ui-cli'

export async function runSimpleDemos(console) {
	console.clear()
	console.success('Simple DB Demos')

	// Quick DB instance
	console.info('1. Quick DB Creation & Connect:')
	const db = new DB({ console })
	await db.connect()
	console.info('   DB connected (in-memory). Root: ' + db.root)

	await pressAnyKey(console)

	// Simple get/set
	console.info('\n2. Simple get/set:')
	await db.set('quick.txt', 'Quick demo content')
	const quick = await db.get('quick.txt')
	console.info(`   Set & Get: "${quick}"`)

	await pressAnyKey(console)

	// Data flatten quick
	console.info('\n3. Quick Data Flatten:')
	const simpleObj = { key: { nested: 'value' } }
	const flatQuick = Data.flatten(simpleObj)
	console.info(`   Flattened: ${JSON.stringify(flatQuick)}`)

	console.success('\nSimple demos complete! ⚡')
}

let keyPressHandlerRegistered = false

export async function pressAnyKey(console) {
	if (!keyPressHandlerRegistered) {
		process.stdin.setMaxListeners(process.stdin.getMaxListeners() + 1)
		keyPressHandlerRegistered = true
	}

	console.info('\n--- Press any key to continue ---')
	await next()
	// Removed clearLine and cursorUp to avoid invalid argument error
	// These operations are not essential for the demo functionality
}
