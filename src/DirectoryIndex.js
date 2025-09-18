import { Enum } from "@nan0web/types"
import DocumentStat from "./DocumentStat.js"

class DirectoryIndexFilter {
	constructor(input = {}) {
		const {

		} = input
	}
	/**
	 * @param {object} input
	 * @returns {DirectoryIndexFilter}
	 */
	static from(input) {
		if (input instanceof DirectoryIndexFilter) return input
		return new DirectoryIndexFilter(input)
	}
}

class DirectoryIndex {
	static ENTRIES_AS_ARRAY = "array"
	static ENTRIES_AS_OBJECT = "object"
	static ENTRIES_AS_ROWS = "rows"
	static ENTRIES_AS_TEXT = "text"
	static COLUMNS = ["type", "name", "mtimeMs.36", "size.36"]
	static FULL_INDEX = "index.jsonl"
	static INDEX = "index.txt"
	static Filter = DirectoryIndexFilter
	/** @type {string[]} */
	entriesColumns = DirectoryIndex.COLUMNS
	/** @type {string} */
	entriesAs = DirectoryIndex.ENTRIES_AS_ARRAY
	/** @type {Array<[string, DocumentStat]>} */
	entries = []
	/** @type {number} */
	maxEntriesOnLoad = 12
	/** @type {DirectoryIndexFilter} */
	filter

	/**
	 * When entriesColumns fulfilled — indexes are stored as string[][] in data files
	 * instead of Record<string, object>
	 * @param {object} input
	 * @param {string[]} [input.entriesColumns=[]]
	 * @param {Array<[string, DocumentStat]> | string[][] | string[] | string} [input.entries=[]]
	 * @param {string} [input.entriesAs]
	 * @param {number} [input.maxEntriesOnLoad=12]
	 * @param {object} [input.filter]
	 */
	constructor(input = {}) {
		const {
			entries = [],
			entriesColumns = this.entriesColumns,
			entriesAs = this.ENTRIES_AS_ARRAY,
			maxEntriesOnLoad = 12,
			filter = new DirectoryIndexFilter(),
		} = input
		this.entriesColumns = entriesColumns
		this.entriesAs = Enum(...this.ENTRIES_AS_ALL)(entriesAs)
		this.maxEntriesOnLoad = Number(maxEntriesOnLoad)
		this.filter = DirectoryIndexFilter.from(filter)
		this.entries = this.decode(entries)
	}

	/** @returns {string} */
	get ENTRIES_AS_ARRAY() { return /** @type {typeof DirectoryIndex} */ (this.constructor).ENTRIES_AS_ARRAY }
	/** @returns {string} */
	get ENTRIES_AS_OBJECT() { return /** @type {typeof DirectoryIndex} */ (this.constructor).ENTRIES_AS_OBJECT }
	/** @returns {string} */
	get ENTRIES_AS_ROWS() { return /** @type {typeof DirectoryIndex} */ (this.constructor).ENTRIES_AS_ROWS }
	/** @returns {string} */
	get ENTRIES_AS_TEXT() { return /** @type {typeof DirectoryIndex} */ (this.constructor).ENTRIES_AS_TEXT }
	/** @returns {string[]} */
	get ENTRIES_AS_ALL() {
		return [
			this.ENTRIES_AS_ARRAY,
			this.ENTRIES_AS_OBJECT,
			this.ENTRIES_AS_ROWS,
			this.ENTRIES_AS_TEXT,
		]
	}
	get FULL_INDEX() { return /** @type {typeof DirectoryIndex} */ (this.constructor).FULL_INDEX }
	get INDEX() { return /** @type {typeof DirectoryIndex} */ (this.constructor).INDEX }

	/**
	 * Encodes a component string for safe storage
	 * @param {string} str - String to encode
	 * @returns {string} Encoded string
	 */
	encodeComponent(str) {
		return encodeURIComponent(String(str))
	}

	/**
	 * Encodes entries as array format with columns
	 * @param {Array<[string, DocumentStat]>} entries - Entries to encode
	 * @returns {string[][]} Encoded entries
	 */
	encodeIntoArray(entries) {
		const columnNames = this.entriesColumns.map(c => c.split(".")[0])
		if (2 > columnNames.length) {
			throw new TypeError("To encode index entries as array entriesColumns must be defined, minimum 2 columns: name, mtimeMs")
		}
		if (!columnNames.includes("name")) {
			throw new TypeError("To encode index entries as array entriesColumns must include name column")
		}
		if (!columnNames.includes("mtimeMs")) {
			throw new TypeError("To encode index entries as array entriesColumns must include mtimeMs column")
		}

		return entries.map(	([name, stat]) => {
			return this.entriesColumns.map(col => {
				if ("name" === col) return name
				if ("type" === col) {
					return stat.isFile ? "F" : stat.isDirectory ? "D" : "?"
				}
				if (col.includes(".")) {
					const [key, num] = col.split(".")
					const radix = parseInt(num)
					const value = Number(stat[key])
					if (radix < 2 || radix > 36) {
						throw new TypeError([
							["Incorrect radix for column", col, "=", radix].join(" "),
							["Possible radix in range of 2 - 36"],
						].join("\n"))
					}
					return value.toString(radix)
				}
				return this.encodeComponent(stat[col])
			})
		})
	}

	/**
	 * Encodes entries as rows format
	 * @param {Array<[string, DocumentStat]>} entries - Entries to encode
	 * @param {string} [divider=" "] - Divider character
	 * @returns {string[]} Encoded rows
	 */
	encodeIntoRows(entries, divider = " ") {
		return this.encodeIntoArray(entries).map(cols => cols.join(divider))
	}

	/**
	 * Encodes entries according to specified format
	 * @param {Object} [input]
	 * @param {Array<[string, DocumentStat]>} [input.entries] - Entries to encode, or current entries
	 * @param {string} [input.target] - Target encoding format, or current entriesAs
	 * @returns {string[][] | string[] | string | Array<[string, DocumentStat]>} Encoded entries
	 */
	encode({ entries = this.entries, target = this.entriesAs } = {}) {
		if (target === this.ENTRIES_AS_ARRAY) {
			return this.encodeIntoArray(entries)
		}
		if (target === this.ENTRIES_AS_ROWS) {
			return this.encodeIntoRows(entries)
		}
		if (target === this.ENTRIES_AS_TEXT) {
			return this.encodeIntoRows(entries).join("\n")
		}
		return entries
	}

	/**
	 * Decodes entries from stored format back to [name, DocumentStat] pairs
	 * @param {any} source - Source data to decode
	 * @param {string} target - Target decoding format
	 * @returns {Array<[string, DocumentStat]>} Decoded entries
	 */
	decode(source, target = this.entriesAs) {
		if (target === this.ENTRIES_AS_TEXT) {
			if (typeof source !== 'string') {
				throw new TypeError([
					"Source must be string when decoding as text",
					["But provided", typeof source].join(": ")
				].join("\n"))
			}
			source = source.split("\n")
		}

		if ([this.ENTRIES_AS_ROWS, this.ENTRIES_AS_TEXT].includes(target)) {
			const divider = " "
			source = source.map(row => row.split(divider))
		}

		if ([this.ENTRIES_AS_ARRAY, this.ENTRIES_AS_ROWS, this.ENTRIES_AS_TEXT].includes(target)) {
			if (!Array.isArray(source)) {
				throw new TypeError("Source must be array when decoding as array, rows or text")
			}

			return source.map(row => {
				const values = Array.isArray(row) ? row : [row]
				const stat = {}
				let name = ""

				this.entriesColumns.forEach((col, index) => {
					let radix = 10
					if (col.includes(".")) {
						const arr = col.split(".")
						col = arr[0]
						radix = parseInt(arr[1])
					}
					if ("name" === col) {
						name = values[index]
					}
					else if ("string" === typeof values[index]) {
						stat[col] = parseInt(values[index], radix)
						if (isNaN(stat[col])) {
							stat[col] = decodeURIComponent(values[index] || "")
						}
					}
				})

				return [name, new DocumentStat(stat)]
			})
		}

		return source
	}

	/**
	 * Creates DirectoryIndex instance from input
	 * @param {object|DirectoryIndex} input - Properties or existing instance
	 * @returns {DirectoryIndex}
	 */
	static from(input) {
		if (input instanceof DirectoryIndex) return input
		if (Array.isArray(input)) {
			return new DirectoryIndex({ entries: input })
		}
		return new DirectoryIndex(input)
	}

	/**
	 * Checks if a given path represents an index.
	 *
	 * @param {string} path
	 * @returns {boolean} True if the path is an index
	 */
	static isIndex(path) {
		return path.endsWith(`/${this.INDEX}`) || path === this.INDEX
	}

	/**
	 * Checks if a given path represents a full index.
	 *
	 * @param {string} path
	 * @returns {boolean} True if the path is a full index
	 */
	static isFullIndex(path) {
		return path.endsWith(`/${this.FULL_INDEX}`) || path === this.FULL_INDEX
	}

	/**
	 * Get all indexes that need to be updated when a document changes
	 * @param {import("./DB/DB.js").default} db - Database instance
	 * @param {string} uri - URI of the changed document
	 * @returns {string[]} Array of index URIs to update
	 */
	static getIndexesToUpdate(db, uri) {
		const indexes = []
		let currentDir = db.dirname(uri)

		// Add index files for the directory containing the changed document
		indexes.push(
			db.resolveSync(currentDir, this.FULL_INDEX),
			db.resolveSync(currentDir, this.INDEX)
		)

		// Traverse up the directory tree and add index files for each parent
		while (true) {
			const parentDir = db.dirname(currentDir)
			if (parentDir === currentDir || parentDir === '.') {
				break
			}
			currentDir = parentDir
			indexes.push(
				db.resolveSync(currentDir, this.FULL_INDEX),
				db.resolveSync(currentDir, this.INDEX)
			)
		}

		// Always add root indexes
		indexes.push(
			db.resolveSync('.', this.FULL_INDEX),
			db.resolveSync('.', this.INDEX)
		)

		// Remove duplicates and filter out empty strings
		return [...new Set(indexes)].filter(Boolean)
	}

	/**
	 * Get directory entries (immediate children only)
	 * @param {import("./DB/DB.js").default} db - Database instance
	 * @param {string} dirPath - Path of directory to get entries for
	 * @returns {Promise<Array<[string, DocumentStat]>>} Array of directory entries
	 */
	static async getDirectoryEntries(db, dirPath) {
		const isRoot = dirPath === '.' || dirPath === '/' || dirPath === ''
		const dirPrefix = isRoot ? '' : (dirPath.endsWith('/') ? dirPath : dirPath + '/')

		/** @type {Array<[string, DocumentStat]>} */
		const entries = []
		const files = new Set()

		// Replace db.meta.entries() with db.readDir() that yields only immediate children
		// This ensures we're working with the actual directory listing rather than raw metadata
		const readDirStream = db.readDir(dirPath, { depth: 1 })
		for await (const entry of readDirStream) {
			if (this.isFullIndex(entry.name) || this.isIndex(entry.name)) continue

			// const absolutePath = db.resolveSync(dirPath, entry.name)
			const itemStat = entry.stat

			if (!files.has(entry.name)) {
				// For directories, ensure trailing slash in entry name
				const entryName = entry.stat.isDirectory ? entry.name + '/' : entry.name
				entries.push([entryName, itemStat.isFile || itemStat.isDirectory ? itemStat : new DocumentStat({ isFile: true })])
				files.add(entry.name)
			}
		}

		entries.sort((a, b) => String(a[0]).localeCompare(String(b[0])))

		return entries
	}
}

export default DirectoryIndex
