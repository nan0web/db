import { FilterString } from "@nan0web/types"
import DocumentStat from "./DocumentStat.js"

class DirectoryIndex {
	static COLUMNS = ["name", "mtimeMs.36", "size.36"]
	static FULL_INDEX = "index.txtl"
	static INDEX = "index.txt"

	/** @type {string[]} */
	columns = DirectoryIndex.COLUMNS

	/** @type {Array<[string, DocumentStat]>} */
	entries = []

	/**
	 * @param {object} input
	 * @param {Array<[string, DocumentStat]>} [input.entries=[]]
	 * @param {string[]} [input.columns=DirectoryIndex.COLUMNS]
	 */
	constructor(input = {}) {
		const {
			entries = this.entries,
			columns = this.columns,
		} = input
		this.entries = entries
		this.columns = columns
	}

	/**
	 * Encodes into string rows
	 * @param {Array<[string, DocumentStat]>} entries - Entries to encode
	 * @param {string[]} [columns=this.COLUMNS] - Columns to return
	 * @param {boolean} [inc=false] - Is path incremental or full
	 * @returns {string[]}
	 */
	static encodeRows(entries, columns = this.COLUMNS, inc = false) {
		const isBool = key => key.startsWith("is")
		const isNumber = key => !isBool(key) && "error" !== key
		const sorted = entries.slice()
		sorted.sort((a, b) => a[0].localeCompare(b[0]))
		const rows = []
		for (const [name, stat] of sorted) {
			const cols = []
			for (const col of columns) {
				let key = col
				let radix = 10
				if (col.includes(".")) {
					const parts = col.split(".")
					key = parts[0]
					radix = parseInt(parts[1], 10)
				}
				if (key === "name") {
					if (stat.isDirectory) {
						cols.push(name.endsWith("/") ? name : name + "/")
					} else {
						cols.push(inc ? name.split("/").pop() : name)
					}
				}
				else if (isNumber(key)) {
					cols.push(stat[key].toString(radix))
				}
				else if (isBool(key)) {
					cols.push(stat[key] ? 1 : 0)
				}
				else {
					cols.push(stat[key] || "")
				}
			}
			rows.push(cols.join(" ").trim())
		}
		return rows
	}

	/**
	 * Encodes entries according to specified format
	 * @param {Object} [input]
	 * @param {Array<[string, DocumentStat]>} [input.entries=this.entries] - Entries to encode
	 * @param {string} [input.dir="."] - Directory to start with.
	 * @param {boolean} [input.long=false] - Generates all the children maps if long is TRUE, otherwise only current directory.
	 * @param {boolean} [input.inc=false] - If TRUE, uses incremental path format (no duplicate dir prefixes)
	 * @returns {string} Encoded entries as a string
	 */
	encode({ entries = this.entries, dir = ".", long = false, inc = false } = {}) {
		const lines = []
		if (!dir.endsWith("/")) dir += "/"

		const filtered = entries.filter(([uri]) => {
			if ([".", "./", "/"].includes(dir)) return true
			return uri.startsWith(dir)
		})

		// Add header if custom columns or long format
		if (this.columns !== DirectoryIndex.COLUMNS || long || inc) {
			if (this.columns !== DirectoryIndex.COLUMNS) {
				lines.push(`columns: ${this.columns.join(", ")}`)
			}
			if (long) {
				lines.push("long")
			}
			if (inc) {
				lines.push("inc")
			}
			lines.push("---")
		}

		if (long || inc) {
			// Hierarchical format with context
			const entriesByDir = new Map()

			// Group entries by directory
			for (const [name, stat] of filtered) {
				const entryDir = DirectoryIndex.dirname(name)
				if (!entriesByDir.has(entryDir)) {
					entriesByDir.set(entryDir, [])
				}
				entriesByDir.get(entryDir).push([name, stat])
			}

			// Sort directories by their path to ensure correct hierarchical order
			const sortedDirs = Array.from(entriesByDir.keys()).sort((a, b) => {
				if (a === ".") return -1
				if (b === ".") return 1
				return a.localeCompare(b)
			})

			// Track current context for incremental mode
			let currentContext = "."

			// Encode entries with context
			for (const directory of sortedDirs) {
				const dirEntries = entriesByDir.get(directory)

				// Add context line for directories other than root
				if (directory !== ".") {
					lines.push(directory + "/")
				}

				// Encode each entry in this directory, removing directory prefix from entry name
				const rows = DirectoryIndex.encodeRows(dirEntries, this.columns, inc)
				lines.push(...rows)
			}
		} else {
			// Simple flat format - just encode each entry
			return DirectoryIndex.encodeRows(filtered, this.columns, inc).join("\n")
		}

		return lines.join("\n")
	}

	/**
	 * Checks if a given path represents an index.
	 * @param {string} path
	 * @returns {boolean}
	 */
	static isIndex(path) {
		return path.endsWith(`/${this.INDEX}`) || path === this.INDEX
	}

	/**
	 * Checks if a given path represents a full index.
	 * @param {string} path
	 * @returns {boolean}
	 */
	static isFullIndex(path) {
		return path.endsWith(`/${this.FULL_INDEX}`) || path === this.FULL_INDEX
	}

	/**
	 * Get all indexes that need to be updated when a document changes
	 * @param {import("./DB/DB.js").default} db
	 * @param {string} uri
	 * @returns {string[]}
	 */
	static getIndexesToUpdate(db, uri) {
		const indexes = []
		let currentDir = db.dirname(uri)

		// Add index file for the directory containing the changed document
		if ("." === currentDir) {
			indexes.push(this.FULL_INDEX)
		}
		indexes.push(currentDir === '.' ? this.INDEX : `${currentDir}/${this.INDEX}`)

		// Traverse up the directory tree and add index files for each parent
		while (![".", "./", "/", ""].includes(currentDir)) {
			currentDir = db.dirname(currentDir)
			if (currentDir !== '.' && currentDir !== '') {
				indexes.push(`${currentDir}/${this.INDEX}`)
			} else if (currentDir === '.') {
				indexes.push(this.INDEX)
			}
		}

		// Remove duplicates and filter out empty strings
		return [...new Set(indexes)].filter(Boolean)
	}

	/**
	 * Get directory entries (immediate children only)
	 * @param {import("./DB/DB.js").default} db
	 * @param {string} dirPath
	 * @returns {Promise<Array<[string, DocumentStat]>>}
	 */
	static async getDirectoryEntries(db, dirPath) {
		/** @type {Array<[string, DocumentStat]>} */
		const entries = []
		const files = new Set()

		const readDirStream = db.readDir(dirPath, { includeDirs: true, depth: 0 })
		for await (const entry of readDirStream) {
			if (this.isFullIndex(entry.name) || this.isIndex(entry.name) || files.has(entry.path)) continue

			// Normalize the path to ensure it's relative to the directory
			let relativePath = new FilterString(entry.path).trimEnd("/")
			if (entry.stat.isDirectory) relativePath += "/"
			if (dirPath !== '.' && relativePath.startsWith(dirPath + '/')) {
				relativePath = relativePath.substring(dirPath.length + 1)
			}
			if (relativePath) {
				entries.push([relativePath, entry.stat])
			}
			files.add(entry.path)
		}

		return entries
	}

	/**
	 * Generate indexes for a directory and its subdirectories recursively
	 * @param {import("./DB/DB.js").default} db
	 * @param {string} dirPath
	 * @returns {AsyncGenerator<[string, DirectoryIndex], void, unknown>}
	 */
	static async* generateAllIndexes(db, dirPath = '.') {
		// Generate TXT indexes for each directory (immediate children)
		const directories = new Set()
		const readDirStream = db.readDir(dirPath, { includeDirs: true })

		for await (const entry of readDirStream) {
			const dir = entry.isDirectory ? entry.path : entry.parent
			if (!["", ".", "./", "/"].includes(dir)) {
				directories.add(dir)
			}
		}

		// Add the starting directory itself if it's not root
		if (dirPath !== '.') {
			directories.add(dirPath)
		}

		// Always add root directory
		directories.add('.')

		// For each directory, generate its TXT index (immediate children)
		for (const directory of directories) {
			const entries = await this.getDirectoryEntries(db, directory)

			// Yield TXT index for the directory
			const indexUri = directory === '.' ? this.INDEX : `${directory}/${this.INDEX}`
			yield [indexUri, new DirectoryIndex({ entries })]
		}

		if ("." === dirPath) {
			// Generate one TXTL full index at the root level
			const allEntries = db.loaded ?
				Array.from(db.meta.entries()).filter(
					([path, stat]) => stat.isFile && !this.isFullIndex(path) && !this.isIndex(path)
				) : await this._getAllEntriesFallback(db, dirPath)

			// Yield full TXTL index at the root level
			yield [this.FULL_INDEX, new DirectoryIndex({ entries: allEntries })]
		}
	}

	/**
	 * Fallback method to collect all entries if meta is not loaded
	 * @param {import("./DB/DB.js").default} db
	 * @param {string} dirPath
	 * @returns {Promise<Array<[string, DocumentStat]>>}
	 */
	static async _getAllEntriesFallback(db, dirPath) {
		/** @type {Array<[string, DocumentStat]>} */
		const allEntries = []
		const readDirStream = db.readDir(dirPath)

		for await (const entry of readDirStream) {
			if (!this.isFullIndex(entry.name) && !this.isIndex(entry.name)) {
				const entryName = entry.path + (entry.stat.isDirectory ? '/' : '')
				allEntries.push([entryName, entry.stat])
			}
		}

		return allEntries
	}

	/**
	 * Decodes entries from stored format back to [name, DocumentStat] pairs and returns them in the index
	 * @param {string|object} source - Source data to decode
	 * @returns {DirectoryIndex}
	 */
	static decode(source) {
		if (typeof source === 'object' && !(source instanceof DirectoryIndex)) {
			return new DirectoryIndex(source)
		}

		if (source instanceof DirectoryIndex) {
			return source
		}

		const lines = source.split("\n").filter(line => line.trim() !== "")
		const head = lines.findIndex((str) => "---" === str)
		const config = {
			columns: DirectoryIndex.COLUMNS,
			long: false,
			inc: false,
		}
		let rows = lines
		if (head >= 0) {
			for (const row of lines.slice(0, head)) {
				if (row.includes(": ")) {
					const [key, ...value] = row.split(": ")
					if ("columns" === key) {
						config[key] = value.join(": ").split(", ")
					} else {
						config[key] = value.join(": ")
					}
				} else {
					config[row] = true
				}
			}
			rows = lines.slice(head + 1)
		}
		/** @type {Array<[string, DocumentStat]>} */
		const entries = []
		let currentContext = '.'
		for (const line of rows) {
			const cols = line.split(" ").filter(Boolean)
			const item = {
				path: "",
				name: "",
				mtimeMs: -1,
				size: -1,
			}
			for (let i = 0; i < config.columns.length; i++) {
				let name = config.columns[i]
				let radix = 10
				if (name.includes(".")) {
					const [key, no] = name.split(".")
					name = key
					radix = parseInt(no)
				}
				if ("number" === typeof item[name]) {
					item[name] = parseInt(cols[i] || "", radix)
				} else {
					item[name] = cols[i] || ""
				}
			}

			// Context line (directory)
			if ((config.long || config.inc) && item.name.endsWith('/')) {
				if (config.inc) {
					// Incremental path handling - append to current context
					let relativeDir = item.name.slice(0, -1) // Remove trailing slash
					if (relativeDir.startsWith("/")) {
						currentContext = "."
						relativeDir = relativeDir.slice(1)
					}
					currentContext = currentContext === '.' ? relativeDir : `${currentContext}/${relativeDir}`
				} else {
					// Full path handling - replace current context
					currentContext = item.name.slice(0, -1)
				}
				continue
			}

			// Entry under current context
			let uri = currentContext !== '.' ? `${currentContext}/${item.name}` : item.name
			if (uri.startsWith("./")) uri = uri.slice(2)
			const isDirectory = uri.endsWith('/')

			entries.push([
				uri,
				new DocumentStat({
					isFile: !isDirectory,
					isDirectory: isDirectory,
					mtimeMs: item.mtimeMs || 0,
					size: item.size || 0
				})
			])
		}
		return new DirectoryIndex({ entries })
	}


	/**
	 * Creates DirectoryIndex instance from input
	 * @param {object|DirectoryIndex} input
	 * @returns {DirectoryIndex}
	 */
	static from(input) {
		if (input instanceof DirectoryIndex) return input
		if ("string" === typeof input) {
			return this.decode(input)
		}
		return new DirectoryIndex(input)
	}

	/**
	 * Returns directory for current path.
	 * @param {string} path
	 * @returns {string}
	 */
	static dirname(path) {
		return path.includes("/") ? path.substring(0, path.lastIndexOf("/")) : "."
	}
}

export default DirectoryIndex
