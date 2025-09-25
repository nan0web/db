import { describe, it } from 'node:test'
import assert from 'node:assert'
import { FilterString } from "@nan0web/types"
import DirectoryIndex from './DirectoryIndex.js'
import DocumentStat from './DocumentStat.js'

const basename = (path) => path.split('/').pop()
const dirname = (path) => {
	const parts = path.split('/').filter(part => part.length > 0)
	return parts.slice(0, -1).join('/') || '.'
}

const resolveSync = (dir, name) => {
	if (dir === '.' || dir === '') return name
	return `${dir}${dir.endsWith('/') ? '' : '/'}${name}`
}

const createEntries = (entries) => {
	return entries.map(entry => {
		const isDirectory = entry.uri.endsWith("/")
		const isFile = !isDirectory
		return {
			name: basename(entry.uri),
			parent: dirname(entry.uri),
			path: entry.uri,
			stat: new DocumentStat({ size: 1, mtimeMs: Date.now(), isFile, isDirectory })
		}
	})
}

describe('DirectoryIndex - encodeRows function', () => {
	it('encodes entries with default columns', () => {
		const entries = [
			['file1.txt', new DocumentStat({ mtimeMs: 1625097600000, size: 100 })],
			['dir1/', new DocumentStat({ mtimeMs: 1625097601000, size: 0, isDirectory: true })]
		]

		const result = DirectoryIndex.encodeRows(entries)
		assert.deepStrictEqual(result, [
			'dir1/ kqk55i3s 0',
			'file1.txt kqk55hc0 2s',
		])
	})

	it('encodes entries with custom columns', () => {
		const entries = [
			['file1.txt', new DocumentStat({ mtimeMs: 1625097600000, size: 100, isFile: true })],
			['dir1/', new DocumentStat({ mtimeMs: 1625097601000, size: 0, isDirectory: true })]
		]

		const result = DirectoryIndex.encodeRows(entries, ['name', 'isFile', 'isDirectory'])
		assert.deepStrictEqual(result, [
			'dir1/ 0 1',
			'file1.txt 1 0',
		])
	})

	it('encodes entries with incremental names for files in subdirectories', () => {
		const entries = [
			['content/file1.txt', new DocumentStat({ mtimeMs: 1625097600000, size: 100 })],
			['content/subdir/file2.txt', new DocumentStat({ mtimeMs: 1625097601000, size: 200 })]
		]

		const r1 = DirectoryIndex.encodeRows(entries, DirectoryIndex.COLUMNS, true)
		assert.deepStrictEqual(r1, [
			// 'content/',
			'file1.txt kqk55hc0 2s',
			// 'content/subdir/',
			'file2.txt kqk55i3s 5k'
		])
		const r2 = DirectoryIndex.encodeRows(entries)
		assert.deepStrictEqual(r2, [
			'content/file1.txt kqk55hc0 2s',
			'content/subdir/file2.txt kqk55i3s 5k'
		])
	})
})

describe('DirectoryIndex - TXT format (index.txt)', () => {
	it('encodes immediate directory entries correctly', () => {
		const entries = [
			['about.yaml', new DocumentStat({ mtimeMs: 1625097600, size: 100 })],
			['contacts.yaml', new DocumentStat({ mtimeMs: 1625097601, size: 200 })],
			['blog/', new DocumentStat({ mtimeMs: 1625097602, size: 0, isDirectory: true })]
		]

		const index = new DirectoryIndex({ entries })

		const encoded = String(index.encode()).split('\n')
		const expectedLines = [
			'about.yaml qvjhc0 2s',
			'contacts.yaml qvjhc1 5k',
			'blog/ qvjhc2 0'
		]

		// Check that all expected lines are present in the encoded result
		for (const line of expectedLines) {
			assert.ok(encoded.includes(line), `Encoded result should contain: ${line}`)
		}
	})

	it('decodes TXT format correctly', () => {
		const source = `columns: name, mtimeMs.36, size.36
---
content/ h7v380 5k
blog/ h7v37u 5k
about/ h7v381 8c
about.yaml h7v37t 2s
contacts.yaml h7v37t 5k`

		const index = DirectoryIndex.from(source)

		assert.strictEqual(index.entries.length, 5)
		assert.deepStrictEqual(index.entries[0], [
			"content/",
			new DocumentStat({ mtimeMs: 1041132816, size: 200, isDirectory: true })
		])
		assert.deepStrictEqual(index.entries[1], [
			"blog/",
			new DocumentStat({ mtimeMs: 1041132810, size: 200, isDirectory: true })
		])
		assert.deepStrictEqual(index.entries[2], [
			"about/",
			new DocumentStat({ mtimeMs: 1041132817, size: 300, isDirectory: true })
		])
		assert.deepStrictEqual(index.entries[3], [
			"about.yaml",
			new DocumentStat({ mtimeMs: 1041132809, size: 100, isFile: true })
		])
		assert.deepStrictEqual(index.entries[4], [
			"contacts.yaml",
			new DocumentStat({ mtimeMs: 1041132809, size: 200, isFile: true })
		])
	})
})

describe("DirectoryIndex - TXTL format (index.txtl) with full paths", () => {
	it("encodes hierarchical structure correctly with full paths", () => {
		const entries = [
			["content/blog/post2.yaml", new DocumentStat({ mtimeMs: 1625097601, size: 200, isFile: true })],
			["content/products/item1.yaml", new DocumentStat({ mtimeMs: 1625097602, size: 100, isFile: true })],
			["content/about.yaml", new DocumentStat({ mtimeMs: 1625097600, size: 100, isFile: true })],
			["content/contacts.yaml", new DocumentStat({ mtimeMs: 1625097600, size: 200, isFile: true })],
			["content/blog/post1.yaml", new DocumentStat({ mtimeMs: 1625097601, size: 100, isFile: true })],
			["about/us.html", new DocumentStat({ mtimeMs: 1625097603, size: 300, isFile: true })]
		]

		const index = new DirectoryIndex({ entries })

		const encoded = String(index.encode({ long: true, inc: true })).split("\n")
		assert.deepEqual(encoded, [
			"long",
			"inc",
			"---",
			"about/",
			"us.html qvjhc3 8c",
			"content/",
			"about.yaml qvjhc0 2s",
			"contacts.yaml qvjhc0 5k",
			"content/blog/",
			"post1.yaml qvjhc1 2s",
			"post2.yaml qvjhc1 5k",
			"content/products/",
			"item1.yaml qvjhc2 2s",
		])
	})

	it("decodes hierarchical TXTL format correctly with full paths", () => {
		const source = `columns: name, mtimeMs.36, size.36
long
---
content/
about.yaml h7v37t 2s
contacts.yaml h7v37t 5k
content/blog/
post1.yaml h7v37u 2s
post2.yaml h7v37u 5k
content/products/
item1.yaml h7v380 2s
about/
us.html h7v381 8c`

		const index = DirectoryIndex.from(source)

		assert.strictEqual(index.entries.length, 6)
		assert.deepStrictEqual(index.entries[0], [
			"content/about.yaml",
			new DocumentStat({ mtimeMs: 1041132809, size: 100, isFile: true })
		])
		assert.deepStrictEqual(index.entries[1], [
			"content/contacts.yaml",
			new DocumentStat({ mtimeMs: 1041132809, size: 200, isFile: true })
		])
		assert.deepStrictEqual(index.entries[2], [
			"content/blog/post1.yaml",
			new DocumentStat({ mtimeMs: 1041132810, size: 100, isFile: true })
		])
		assert.deepStrictEqual(index.entries[3], [
			"content/blog/post2.yaml",
			new DocumentStat({ mtimeMs: 1041132810, size: 200, isFile: true })
		])
		assert.deepStrictEqual(index.entries[4], [
			"content/products/item1.yaml",
			new DocumentStat({ mtimeMs: 1041132816, size: 100, isFile: true })
		])
		assert.deepStrictEqual(index.entries[5], [
			"about/us.html",
			new DocumentStat({ mtimeMs: 1041132817, size: 300, isFile: true })
		])
	})
})

describe("DirectoryIndex - TXTL format (index.txtl) with incremental paths", () => {
	it("encodes hierarchical structure correctly with incremental paths", () => {
		const entries = [
			["content/blog/post2.yaml", new DocumentStat({ mtimeMs: 1625097601, size: 200, isFile: true })],
			["content/products/item1.yaml", new DocumentStat({ mtimeMs: 1625097602, size: 100, isFile: true })],
			["content/about.yaml", new DocumentStat({ mtimeMs: 1625097600, size: 100, isFile: true })],
			["content/contacts.yaml", new DocumentStat({ mtimeMs: 1625097600, size: 200, isFile: true })],
			["content/blog/post1.yaml", new DocumentStat({ mtimeMs: 1625097601, size: 100, isFile: true })],
			["about/us.html", new DocumentStat({ mtimeMs: 1625097603, size: 300, isFile: true })]
		]

		const index = new DirectoryIndex({ entries })

		const encoded = String(index.encode({ long: true, inc: true })).split("\n")
		assert.deepEqual(encoded, [
			"long",
			"inc",
			"---",
			"about/",
			"us.html qvjhc3 8c",
			"content/",
			"about.yaml qvjhc0 2s",
			"contacts.yaml qvjhc0 5k",
			"content/blog/",
			"post1.yaml qvjhc1 2s",
			"post2.yaml qvjhc1 5k",
			"content/products/",
			"item1.yaml qvjhc2 2s",
		])
	})

	it("decodes hierarchical TXTL format correctly with incremental paths", () => {
		const source = `columns: name, mtimeMs.36, size.36
long
inc
---
content/
about.yaml h7v37t 2s
contacts.yaml h7v37t 5k
blog/
post1.yaml h7v37u 2s
post2.yaml h7v37u 5k
products/
item1.yaml h7v380 2s
/about/
us.html h7v381 8c`

		const index = DirectoryIndex.from(source)

		assert.strictEqual(index.entries.length, 6)
		assert.deepStrictEqual(index.entries[0], [
			"content/about.yaml",
			new DocumentStat({ mtimeMs: 1041132809, size: 100, isFile: true })
		])
		assert.deepStrictEqual(index.entries[1], [
			"content/contacts.yaml",
			new DocumentStat({ mtimeMs: 1041132809, size: 200, isFile: true })
		])
		assert.deepStrictEqual(index.entries[2], [
			"content/blog/post1.yaml",
			new DocumentStat({ mtimeMs: 1041132810, size: 100, isFile: true })
		])
		assert.deepStrictEqual(index.entries[3], [
			"content/blog/post2.yaml",
			new DocumentStat({ mtimeMs: 1041132810, size: 200, isFile: true })
		])
		assert.deepStrictEqual(index.entries[4], [
			"content/blog/products/item1.yaml",
			new DocumentStat({ mtimeMs: 1041132816, size: 100, isFile: true })
		])
		assert.deepStrictEqual(index.entries[5], [
			"about/us.html",
			new DocumentStat({ mtimeMs: 1041132817, size: 300, isFile: true })
		])
	})
})

describe("DirectoryIndex - getDirectoryEntries", () => {
	it("returns immediate children for root directory", async () => {
		const db = {
			basename,
			dirname,
			resolveSync,
			readDir: async function* (uri) {
				const entries = [
					{ path: 'file1.txt', name: 'file1.txt', stat: new DocumentStat({ size: 100, isFile: true }) },
					{ path: 'dir1', name: 'dir1', stat: new DocumentStat({ size: 4096, isDirectory: true }) }
				]
				for (const entry of entries) yield entry
			}
		}

		const entries = await DirectoryIndex.getDirectoryEntries(db, '.')
		assert.strictEqual(entries.length, 2, 'Should return direct children only')
		assert.deepStrictEqual(
			entries.map(([name]) => name).sort(),
			['dir1/', 'file1.txt'].sort()
		)
	})

	it.skip('returns immediate children for subdirectory', async () => {
		const db = {
			basename,
			dirname,
			resolveSync,
			readDir: async function* (uri) {
				const entries = [
					{ path: 'content/file1.txt', name: 'file1.txt', stat: new DocumentStat({ size: 100, isFile: true }) },
					{ path: 'content/dir1', name: 'dir1', stat: new DocumentStat({ size: 4_096, isDirectory: true }) },
					{ path: 'content/dir1/file2.txt', name: 'file2.txt', stat: new DocumentStat({ size: 200, isFile: true }) }
				]
				for (const entry of entries) {
					if (entry.path.startsWith(uri + '/') || entry.path === uri) {
						yield entry
					}
				}
			}
		}

		const entries = await DirectoryIndex.getDirectoryEntries(db, 'content')
		assert.strictEqual(entries.length, 2, 'Should return direct children only')
		assert.deepStrictEqual(
			entries.map(([name]) => name).sort(),
			['dir1/', 'file1.txt'].sort()
		)
	})

	it("ignores index files when collecting entries", async () => {
		const db = {
			basename,
			dirname,
			resolveSync,
			readDir: async function* (uri) {
				const entries = [
					{ path: 'dir1/file1.txt', name: 'file1.txt', stat: new DocumentStat({ size: 100, isFile: true }) },
					{ path: 'dir1/index.txt', name: 'index.txt', stat: new DocumentStat({ size: 50, isFile: true }) },
					{ path: 'dir1/index.txtl', name: 'index.txtl', stat: new DocumentStat({ size: 75, isFile: true }) }
				]
				for (const entry of entries) yield entry
			}
		}

		const entries = await DirectoryIndex.getDirectoryEntries(db, 'dir1')
		assert.strictEqual(entries.length, 1, "Index files should be ignored")
		assert.strictEqual(entries[0][0], 'file1.txt')
	})
})

describe("DirectoryIndex - generateAllIndexes", () => {
	it("generates TXT and TXTL indexes correctly", async () => {
		const entries = createEntries([
			{ uri: 'file1.txt' },
			{ uri: 'dir1/' },
			{ uri: 'dir1/file2.txt' },
			{ uri: 'dir1/subdir/' },
			{ uri: 'dir1/subdir/file3.txt' },
			{ uri: 'dir2/' },
			{ uri: 'dir2/file4.txt' }
		])
		const db = {
			basename,
			dirname,
			resolveSync,
			loaded: true,
			meta: new Map(entries.map(entry => [new FilterString(entry.path).trimEnd("/"), entry.stat])),
			readDir: async function* (uri, options = { depth: -1 }) {
				// Filter entries based on the uri and depth
				for (const entry of entries) {
					const path = new FilterString(entry.path).trimEnd("/")
					if (uri === '.' || uri === '') {
						if (options.depth === 0) {
							if (path.split("/").length === 1) {
								yield entry
							}
						} else {
							yield entry
						}
					} else if (path.startsWith(uri + '/')) {
						const relativePath = path.substring(uri.length + 1)
						const depth = relativePath.split('/').length - 1
						if (options.depth === 0) {
							if (depth === 0 || (depth === 1 && entry.stat.isDirectory)) {
								yield entry
							}
						} else {
							yield entry
						}
					} else if (entry.path === uri) {
						// ignore the "."
						// yield entry
					}
				}
			}
		}

		async function toArray(asyncIterable) {
			const result = []
			for await (const item of asyncIterable) result.push(item)
			return result
		}

		const r1 = await toArray(db.readDir('.', { depth: 0 }));
		const p1 = r1.map(r => r.path);
		assert.deepStrictEqual(p1.sort(), ['file1.txt', 'dir1/', 'dir2/'].sort())
		const r2 = await toArray(db.readDir('.', { depth: -1 }))
		const p2 = r2.map(r => r.path)
		assert.deepStrictEqual(p2.sort(), [
			'file1.txt', 'dir1/', 'dir1/file2.txt', 'dir1/subdir/', 'dir1/subdir/file3.txt',
			'dir2/', 'dir2/file4.txt'
		].sort())
		const r3 = await toArray(db.readDir('dir1', { depth: -1 }))
		const p3 = r3.map(r => r.path)
		assert.deepStrictEqual(p3.sort(), [
			'dir1/file2.txt', 'dir1/subdir/', 'dir1/subdir/file3.txt'
		].sort())
		const r4 = await toArray(db.readDir('dir1/subdir', { depth: 0 }))
		const p4 = r4.map(r => r.path)
		assert.deepStrictEqual(p4, ['dir1/subdir/file3.txt'])

		const indexes = []
		for await (const [uri, index] of DirectoryIndex.generateAllIndexes(db)) {
			indexes.push({ uri, entries: index.entries })
		}

		const cleaned = indexes.map(entry => [
			entry.uri,
			entry.entries.map(([uri]) => uri)
		])
		assert.deepStrictEqual(cleaned, [
			["dir1/index.txt", ["file2.txt", "subdir/"]],
			["dir1/subdir/index.txt", ["file3.txt"]],
			["dir2/index.txt", ["file4.txt"]],
			["index.txt", ["file1.txt", "dir1/", "dir2/"]],
			["index.txtl", [
				"file1.txt", "dir1/file2.txt", "dir1/subdir/file3.txt", "dir2/file4.txt",
			]],
		])
	})
})
