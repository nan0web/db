import { Enum } from '@nan0web/types'

/**
 * Resolves a value that may be a boolean or a bound method (e.g. from fs.Stats)
 * @param {*} value
 * @param {object} context
 * @returns {boolean}
 */
const resolveValue = (value, context) => ('function' === typeof value ? value.call(context) : value)

/**
 * Represents statistics for a document in the filesystem
 * @class
 */
class DocumentStat {
	/** @type {number} */
	atimeMs
	/** @type {number} */
	btimeMs
	/** @type {number} */
	blksize
	/** @type {number} */
	blocks
	/** @type {number} */
	ctimeMs
	/** @type {number} */
	dev
	/** @type {number} */
	gid
	/** @type {number} */
	ino
	/** @type {number} */
	mode
	/** @type {number} */
	mtimeMs
	/** @type {number} */
	size
	/** @type {number} */
	nlink
	/** @type {number} */
	rdev
	/** @type {number} */
	uid

	/** @type {boolean} */
	isBlockDevice
	/** @type {boolean} */
	isDirectory
	/** @type {boolean} */
	isFile
	/** @type {boolean} */
	isFIFO
	/** @type {boolean} */
	isSocket
	/** @type {boolean} */
	isSymbolicLink

	/** @type {Error|null} */
	error

	/**
	 * Creates a new DocumentStat instance
	 * @param {object} input
	 * @param {number} [input.atimeMs=0]
	 * @param {number} [input.btimeMs=0]
	 * @param {number} [input.blksize=0]
	 * @param {number} [input.blocks=0]
	 * @param {number} [input.ctimeMs=0]
	 * @param {number} [input.dev=0]
	 * @param {number} [input.gid=0]
	 * @param {number} [input.ino=0]
	 * @param {number} [input.mode=0]
	 * @param {number} [input.mtimeMs=0]
	 * @param {number} [input.nlink=0]
	 * @param {number} [input.rdev=0]
	 * @param {number} [input.size=0]
	 * @param {number} [input.uid=0]
	 * @param {boolean} [input.isBlockDevice=false]
	 * @param {boolean} [input.isDirectory=false]
	 * @param {boolean} [input.isFile=false]
	 * @param {boolean} [input.isFIFO=false]
	 * @param {boolean} [input.isSocket=false]
	 * @param {boolean} [input.isSymbolicLink=false]
	 * @param {boolean} [input.type=""] The file type if provided then used: F, D.
	 * @param {Error|null} [input.error=null]
	 */
	constructor(input = {}) {
		const {
			atimeMs = 0,
			btimeMs = 0,
			blksize = 0,
			blocks = 0,
			ctimeMs = 0,
			dev = 0,
			gid = 0,
			ino = 0,
			mode = 0,
			mtimeMs = 0,
			size = 0,
			nlink = 0,
			rdev = 0,
			uid = 0,
			isBlockDevice = false,
			isDirectory: isDirectoryInit = false,
			isFile: isFileInit = false,
			isFIFO = false,
			isSocket = false,
			isSymbolicLink = false,
			error = null,
			type = '',
		} = input
		this.atimeMs = atimeMs
		this.btimeMs = btimeMs
		this.blksize = blksize
		this.blocks = blocks
		this.ctimeMs = ctimeMs
		this.dev = dev
		this.gid = gid
		this.ino = ino
		this.mode = mode
		this.mtimeMs = mtimeMs
		this.size = size
		this.nlink = nlink
		this.rdev = rdev
		this.uid = uid
		const realType = Enum('F', 'D', '')(type)
		const isFile = 'F' === realType || isFileInit
		const isDirectory = 'D' === realType || isDirectoryInit
		this.isBlockDevice = resolveValue(isBlockDevice, input)
		this.isDirectory = resolveValue(isDirectory, input)
		this.isFile = resolveValue(isFile, input)
		this.isFIFO = resolveValue(isFIFO, input)
		this.isSocket = resolveValue(isSocket, input)
		this.isSymbolicLink = resolveValue(isSymbolicLink, input)
		this.error = error
	}

	/**
	 * Get access time as Date object
	 * @returns {Date}
	 */
	get atime() {
		return new Date(this.atimeMs)
	}

	/**
	 * Get birth time as Date object
	 * @returns {Date}
	 */
	get btime() {
		return new Date(this.btimeMs)
	}

	/**
	 * Get change time as Date object
	 * @returns {Date}
	 */
	get ctime() {
		return new Date(this.ctimeMs)
	}

	/**
	 * Get modification time as Date object
	 * @returns {Date}
	 */
	get mtime() {
		return new Date(this.mtimeMs)
	}

	/**
	 * Check if document exists
	 * @returns {boolean}
	 */
	get exists() {
		return Boolean(this.blksize || this.mtimeMs || this.size)
	}

	/**
	 * Returns the short file type: D, F, ?
	 * @returns {string}
	 */
	get type() {
		return this.isDirectory ? 'D' : this.isFile ? 'F' : '?'
	}

	/**
	 * Creates DocumentStat instance from input
	 * @param {object|DocumentStat} input - Properties or existing instance
	 * @returns {DocumentStat}
	 */
	static from(input) {
		if (input instanceof DocumentStat) return input
		return new this(input)
	}
}

export default DocumentStat
