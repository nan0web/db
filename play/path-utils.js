#!/usr/bin/env node

import {
	extname,
	basename,
	dirname,
	normalize,
	absolute,
	relative,
	isRemote,
	isAbsolute,
	resolveSync,
} from '../src/DB/path.js'
import { pressAnyKey } from './simple-demos.js'
import { tabbed } from './utils/index.js'

export async function runPathUtilsDemo(console) {
	console.clear()
	console.success('Path Utilities Demo')

	// Demo: extname
	console.info('1. Extracting file extensions:')
	console.info(tabbed(`extname("file.TXT") → ${JSON.stringify(extname('file.TXT'))}`))
	console.info(tabbed(`extname("archive.tar.gz") → ${JSON.stringify(extname('archive.tar.gz'))}`))
	console.info(tabbed(`extname("noext") → ${JSON.stringify(extname('noext'))}`))
	console.info(tabbed(`extname("/dir/") → ${JSON.stringify(extname('/dir/'))}`))

	await pressAnyKey(console)

	// Demo: basename
	console.info('\n2. Extracting basenames:')
	console.info(tabbed(`basename("/dir/file.txt") → ${JSON.stringify(basename('/dir/file.txt'))}`))
	console.info(
		tabbed(
			`basename("/dir/file.txt", ".txt") → ${JSON.stringify(basename('/dir/file.txt', '.txt'))}`,
		),
	)
	console.info(
		tabbed(`basename("/dir/file.txt", true) → ${JSON.stringify(basename('/dir/file.txt', true))}`),
	)
	console.info(tabbed(`basename("/dir/") → ${JSON.stringify(basename('/dir/'))}`))

	await pressAnyKey(console)

	// Demo: dirname
	console.info('\n3. Extracting directory names:')
	console.info(tabbed(`dirname("/a/b/file") → ${JSON.stringify(dirname('/a/b/file'))}`))
	console.info(tabbed(`dirname("/a/b/") → ${JSON.stringify(dirname('/a/b/'))}`))
	console.info(tabbed(`dirname("/file") → ${JSON.stringify(dirname('/file'))}`))
	console.info(tabbed(`dirname("file.txt") → ${JSON.stringify(dirname('file.txt'))}`))

	await pressAnyKey(console)

	// Demo: normalize
	console.info('\n4. Normalizing paths:')
	console.info(tabbed(`normalize("a/b/../c") → ${JSON.stringify(normalize('a/b/../c'))}`))
	console.info(tabbed(`normalize("a//b///c") → ${JSON.stringify(normalize('a//b///c'))}`))
	console.info(tabbed(`normalize("dir/sub/") → ${JSON.stringify(normalize('dir/sub/'))}`))

	await pressAnyKey(console)

	// Demo: absolute
	console.info('\n5. Building absolute paths:')
	console.info(
		tabbed(
			`absolute("/base", "root", "file") → ${JSON.stringify(absolute('/base', 'root', 'file'))}`,
		),
	)
	console.info(
		tabbed(
			`absolute("https://ex.com", "api", "v1") → ${JSON.stringify(absolute('https://ex.com', 'api', 'v1'))}`,
		),
	)

	await pressAnyKey(console)

	// Demo: relative
	console.info('\n6. Computing relative paths:')
	console.info(tabbed(`relative("/a/b", "/a/c") → ${JSON.stringify(relative('/a/b', '/a/c'))}`))
	console.info(
		tabbed(`relative("/root/dir", "/root/") → ${JSON.stringify(relative('/root/dir', '/root/'))}`),
	)

	await pressAnyKey(console)

	// Demo: resolveSync
	console.info('\n7. Synchronous path resolution:')
	console.info(
		tabbed(
			`resolveSync("/base", ".", "a/b/../c") → ${JSON.stringify(resolveSync('/base', '.', 'a/b/../c'))}`,
		),
	)

	await pressAnyKey(console)

	// Demo: isRemote and isAbsolute
	console.info('\n8. Checking URI types:')
	console.info(tabbed(`isRemote("https://ex.com") → ${JSON.stringify(isRemote('https://ex.com'))}`))
	console.info(tabbed(`isAbsolute("/abs/path") → ${JSON.stringify(isAbsolute('/abs/path'))}`))
	console.info(tabbed(`isAbsolute("./rel") → ${JSON.stringify(isAbsolute('./rel'))}`))

	console.success('\nPath utilities demo complete! 🛤️')
}
