import DocumentEntry from "./DocumentEntry.js"

/**
 * Represents a stream entry with progress information
 * @class
 */
class StreamEntry {
	/** @type {DocumentEntry} */
	file
	/** @type {DocumentEntry[]} */
	files
	/** @type {Map<string, DocumentEntry>} */
	dirs
	/** @type {Map<string, DocumentEntry>} */
	top
	/** @type {Map<string, Error | null>} */
	errors
	/** @type {number} */
	progress
	/** @type {{ dirs: number, files: number }} */
	totalSize

	/**
	 * Creates a new StreamEntry instance
	 * @param {object} input
	 * @param {DocumentEntry|object} [input.file={}]
	 * @param {DocumentEntry[]|object[]} [input.files=[]]
	 * @param {Map<string, DocumentEntry>} [input.dirs=new Map()]
	 * @param {Map<string, DocumentEntry>} [input.top=new Map()]
	 * @param {Map<string, Error | null>} [input.errors=new Map()]
	 * @param {number} [input.progress=0]
	 * @param {{ dirs: number, files: number }} [input.totalSize={ dirs: 0, files: 0 }]
	 */
	constructor(input = {}) {
		const {
			file = {},
			files = [],
			dirs = new Map(),
			top = new Map(),
			errors = new Map(),
			progress = 0,
			totalSize = { dirs: 0, files: 0 }
		} = input

		this.file = DocumentEntry.from(file)
		this.files = files.map(f => DocumentEntry.from(f))
		this.dirs = new Map(dirs)
		this.top = new Map(top)
		this.errors = new Map(errors)
		this.progress = Number(progress)
		this.totalSize = totalSize
	}
}

export default StreamEntry