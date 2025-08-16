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
			isDirectory = false,
			isFile = false,
			isFIFO = false,
			isSocket = false,
			isSymbolicLink = false,
			error = null,
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
		// @ts-ignore
		this.isBlockDevice = "function" === typeof isBlockDevice ? isBlockDevice.bind(input)() : isBlockDevice
		// @ts-ignore
		this.isDirectory = "function" === typeof isDirectory ? isDirectory.bind(input)() : isDirectory
		// @ts-ignore
		this.isFile = "function" === typeof isFile ? isFile.bind(input)() : isFile
		// @ts-ignore
		this.isFIFO = "function" === typeof isFIFO ? isFIFO.bind(input)() : isFIFO
		// @ts-ignore
		this.isSocket = "function" === typeof isSocket ? isSocket.bind(input)() : isSocket
		// @ts-ignore
		this.isSymbolicLink = "function" === typeof isSymbolicLink ? isSymbolicLink.bind(input)() : isSymbolicLink
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
		return Boolean(this.blksize || this.mtimeMs)
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
