import DocumentStat from "./DocumentStat.js"

/**
 * Represents a document entry in the filesystem
 * @class
 */
class DocumentEntry {
	/** @type {string} */
	name
	/** @type {DocumentStat} */
	stat
	/** @type {number} */
	depth
	/** @type {string} */
	path
	/** @type {string} */
	parent
	/** @type {boolean} */
	fulfilled

	/**
	 * Creates a new DocumentEntry instance
	 * @param {object} input
	 * @param {string} [input.name=""]
	 * @param {DocumentStat|object} [input.stat={}]
	 * @param {number} [input.depth=0]
	 * @param {string} [input.path=""]
	 * @param {string} [input.parent=""]
	 * @param {boolean | undefined} [input.fulfilled]
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
	 * @returns {boolean}
	 */
	get isDirectory() {
		return !!this.stat.isDirectory
	}

	/**
	 * Check if entry is a file
	 * @returns {boolean}
	 */
	get isFile() {
		return !!this.stat.isFile
	}

	/**
	 * Check if entry is a symbolic link
	 * @returns {boolean}
	 */
	get isSymbolicLink() {
		return !!this.stat.isSymbolicLink
	}

	/**
	 * Get string representation of entry
	 * @returns {string}
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
	 * @param {object|DocumentEntry} input
	 * @returns {DocumentEntry}
	 */
	static from(input) {
		if (input instanceof DocumentEntry) return input
		return new DocumentEntry(input)
	}
}

export default DocumentEntry
