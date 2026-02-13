#!/usr/bin/env node

import { DB, DirectoryIndex } from '../src/index.js'
import { pressAnyKey } from './simple-demos.js'

export async function runIndexUtilsDemo(console) {
	console.clear()
	console.success('Directory Index Utils Demo')

	// Setup DB with directory structure
	const db = new DB({
		console: console,
		predefined: [
			['docs/readme.md', 'DB docs'],
			['docs/api.txt', 'API details'],
			['src/db.js', 'Core DB'],
			['src/data.js', 'Data utils'],
			['blog/post1.md', 'First post'],
			['blog/post2.md', 'Second post'],
		],
	})
	await db.connect()

	console.info('DB with structure:')
	console.info('• docs/ (dir with readme.md, api.txt)')
	console.info('• src/ (dir with db.js, data.js)')
	console.info('• blog/ (dir with post1.md, post2.md)\n')

	await pressAnyKey(console)

	// Demo: build indexes
	console.info('1. Building indexes for all directories:')
	await db.buildIndexes()
	console.info('   Indexes created:')
	console.info(`   • index.txt (root: all immediate children)`)
	console.info(`   • docs/index.txt (docs children)`)
	console.info(`   • src/index.txt (src children)`)
	console.info(`   • blog/index.txt (blog children)`)
	console.info(`   • index.txtl (full hierarchical root index)`)

	const rootIndex = db.data.get('index.txt')
	console.info(
		`\n   Root index.txt sample:\n   ${rootIndex?.split('\n').slice(0, 3).join('\n   ')}...`,
	)

	await pressAnyKey(console)

	// Demo: load index
	console.info('\n2. Loading root index:')
	const loadedIndex = await db.loadIndex('.')
	console.info(`   Entries count: ${loadedIndex.entries.length}`)
	console.info(
		`   Sample: ${loadedIndex.entries
			.slice(0, 2)
			.map(([name]) => name)
			.join(', ')}`,
	)

	await pressAnyKey(console)

	// Demo: save index
	console.info("\n3. Saving custom index for 'docs/':")
	const docsEntries = await DirectoryIndex.getDirectoryEntries(db, 'docs')
	await db.saveIndex('docs', docsEntries)
	const savedDocsIndex = db.data.get('docs/index.txt')
	console.info(`   Saved docs/index.txt:\n   ${savedDocsIndex}`)

	console.success('\nIndex utils demo complete! 📂')
}
