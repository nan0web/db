import DocumentEntry from './DocumentEntry.js'

/**
 * Represents a stream entry with progress information
 * Aggregates file lists, directories, errors, and stats during directory traversal.
 * Used in findStream for real-time progress in large scans.
 *
 * Tracks:
 * - Current file
 * - Cumulative files (sorted)
 * - Dirs and top-level entries
 * - Errors encountered
 * - Progress percentage and total sizes
 *
 * Usage:
 * ```js
 * for await (const entry of db.findStream('.')) {
 *   console.log(entry.progress, entry.totalSize);
 * }
 * ```
 *
 * @class
 */
class StreamEntry {
	/** @type {DocumentEntry} Current file being processed */
	file
	/** @type {DocumentEntry[]} All files found so far (sorted) */
	files
	/** @type {Map<string, DocumentEntry>} Directories encountered */
	dirs
	/** @type {Map<string, DocumentEntry>} Top-level (immediate) entries */
	top
	/** @type {Map<string, Error | null>} Errors during traversal */
	errors
	/** @type {number} Progress (0-1) */
	progress
	/** @type {{ dirs: number, files: number }} Cumulative sizes */
	totalSize

	/**
	 * Creates a new StreamEntry instance
	 * Converts inputs to proper types (e.g., DocumentEntry).
	 * @param {object} input
	 * @param {DocumentEntry|object} [input.file={}] - Current entry
	 * @param {DocumentEntry[]|object[]} [input.files=[]] - File list
	 * @param {Map<string, DocumentEntry>} [input.dirs=new Map()] - Dirs
	 * @param {Map<string, DocumentEntry>} [input.top=new Map()] - Top entries
	 * @param {Map<string, Error | null>} [input.errors=new Map()] - Errors
	 * @param {number} [input.progress=0] - Progress fraction
	 * @param {{ dirs: number, files: number }} [input.totalSize={ dirs: 0, files: 0 }] - Sizes
	 */
	constructor(input = {}) {
		const {
			file = {},
			files = [],
			dirs = new Map(),
			top = new Map(),
			errors = new Map(),
			progress = 0,
			totalSize = { dirs: 0, files: 0 },
		} = input

		this.file = DocumentEntry.from(file)
		this.files = files.map((f) => DocumentEntry.from(f))
		this.dirs = new Map(dirs)
		this.top = new Map(top)
		this.errors = new Map(errors)
		this.progress = Number(progress)
		this.totalSize = totalSize
	}
}

export default StreamEntry
