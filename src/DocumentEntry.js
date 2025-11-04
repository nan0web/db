import DocumentStat from "./DocumentStat.js"

/**
 * Represents a document entry in the filesystem or database.
 * Combines path info (name, parent, depth) with stats (size, type, timestamps).
 * Used in directory listings from readDir/listDir.
 *
 * Auto-derives name/parent/depth from path if not provided.
 * Fulfilled indicates if stat data is complete (exists check).
 *
 * Usage:
 * ```js
 * const entry = new DocumentEntry({ path: 'file.txt', stat: new DocumentStat({ isFile: true }) });
 * entry.isFile; // true
 * entry.toString(); // 'F file.txt'
 * ```
 *
 * @class
 */
class DocumentEntry {
	/** @type {string} Basename of the entry */
	name
	/** @type {DocumentStat} File/directory statistics */
	stat
	/** @type {number} Nesting depth in directory tree */
	depth
	/** @type {string} Full path URI */
	path
	/** @type {string} Parent directory path */
	parent
	/** @type {boolean} If stat is complete/resolved */
	fulfilled

	/**
	 * Creates a new DocumentEntry instance
	 * @param {object} input
	 * @param {string} [input.name=""] - Entry basename
	 * @param {DocumentStat|object} [input.stat={}] - Stats object
	 * @param {number} [input.depth=0] - Nesting level
	 * @param {string} [input.path=""] - Full path (auto-derives name/parent if missing)
	 * @param {string} [input.parent=""] - Parent path
	 * @param {boolean | undefined} [input.fulfilled] - If entry is fully resolved
	 */
	constructor(input = {}) {
		const {
			name = "",
			stat = {},
			depth = 0,
			path = "",
			parent = "",
			fulfilled: fulfilledInit = undefined
		} = input

		this.name = String(name)
		this.stat = DocumentStat.from(stat)
		this.depth = Number(depth)
		this.path = String(path)
		this.parent = String(parent)

		if (!this.name && this.path) {
			this.name = String(this.path.split("/").pop() ?? "")
		}
		if (!this.parent && this.path.includes("/")) {
			const arr = this.path.split("/")
			if (!this.depth) this.depth = arr.length
			arr.pop()
			this.parent = arr.join("/")
		}
		this.fulfilled = Boolean(
			undefined === fulfilledInit ? this.path && this.stat.exists : fulfilledInit
		)
	}

	/**
	 * Check if entry is a directory
	 * Delegates to stat.isDirectory.
	 * @returns {boolean}
	 */
	get isDirectory() {
		return !!this.stat.isDirectory
	}

	/**
	 * Check if entry is a file
	 * Delegates to stat.isFile.
	 * @returns {boolean}
	 */
	get isFile() {
		return !!this.stat.isFile
	}

	/**
	 * Check if entry is a symbolic link
	 * Delegates to stat.isSymbolicLink.
	 * @returns {boolean}
	 */
	get isSymbolicLink() {
		return !!this.stat.isSymbolicLink
	}

	/**
	 * Get string representation of entry
	 * Format: Type (D/F/L/?) + path/name.
	 * @returns {string} e.g., "F file.txt"
	 */
	toString() {
		return [
			this.isDirectory ? "D"
				: this.isFile ? "F"
					: this.isSymbolicLink ? "L"
						: "?",
			this.path || this.name
		].filter(Boolean).join(" ")
	}

	/**
	 * Creates a DocumentEntry from input
	 * Handles plain objects or existing instances.
	 * @param {object|DocumentEntry} input
	 * @returns {DocumentEntry}
	 */
	static from(input) {
		if (input instanceof DocumentEntry) return input
		return new DocumentEntry(input)
	}
}

export default DocumentEntry