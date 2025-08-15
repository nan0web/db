import { FilterString, oneOf } from "@nan0web/types"
import DocumentStat from "./DocumentStat.js"
import DocumentEntry from "./DocumentEntry.js"
import StreamEntry from "./StreamEntry.js"
import Data from "./Data.js"
import Directory from "./Directory.js"

class GetOpts {
	defaultValue = undefined
	constructor(input = {}) {
		const {
			defaultValue = this.defaultValue,
		} = input
		this.defaultValue = defaultValue
	}
	/**
	 * @param {object} input
	 * @returns {GetOpts}
	 */
	static from(input) {
		if (input instanceof GetOpts) return input
		return new GetOpts(input)
	}
}

class FetchOptions {
	globals = true
	inherit = true
	refs = true
	defaultValue = undefined
	allowDirs = true
	constructor(input = {}) {
		const {
			globals = true,
			inherit = true,
			refs = true,
			defaultValue = undefined,
			allowDirs = true,
		} = input
		this.globals = Boolean(globals)
		this.inherit = Boolean(inherit)
		this.refs = Boolean(refs)
		this.defaultValue = defaultValue
		this.allowDirs = Boolean(allowDirs)
	}
	/**
	 * @param {object} input
	 * @returns {FetchOptions}
	 */
	static from(input) {
		if (input instanceof FetchOptions) return input
		return new FetchOptions(input)
	}
}

/**
 * Base database class for document storage and retrieval
 * @class
 */
class DB {
	static Data = Data
	static Directory = Directory
	static GetOpts = GetOpts
	static FetchOptions = FetchOptions
	static DATA_EXTNAMES = [".json", ".yaml", ".yml", ".nano", ".html", ".xml"]
	/** @type {string} */
	encoding = "utf-8"
	/** @type {Map<string, any | false>} */
	data = new Map()
	/** @type {Map<string, DocumentStat>} */
	meta = new Map()
	/** @type {boolean} */
	connected = false
	/** @type {string} */
	root
	/** @type {string} */
	cwd = "."
	/** @type {DB[]} */
	dbs
	/** @type {Map<string, any>} */
	_inheritanceCache = new Map()

	/**
	 * Creates a new DB instance from input object
	 * that can include configuration for:
	 * - root directory,
	 * - working directory,
	 * - data and metadata maps,
	 * - connection status,
	 * - attached databases.
	 *
	 * @param {object} input
	 * @param {string} [input.root="."]
	 * @param {string} [input.cwd="."]
	 * @param {boolean} [input.connected=false]
	 * @param {Map<string, any | false>} [input.data=new Map()]
	 * @param {Map<string, DocumentStat>} [input.meta=new Map()]
	 * @param {DB[]} [input.dbs=[]]
	 */
	constructor(input = {}) {
		const {
			root = ".",
			cwd = ".",
			data = new Map(),
			meta = new Map(),
			connected = false,
			dbs = [],
		} = input
		this.root = root
		this.cwd = cwd
		this.data = data instanceof Map ? data : new Map(data)
		this.meta = meta instanceof Map ? meta : new Map(meta)
		this.connected = connected
		// Ensure that we have DB instances in the array
		// For the base it is always [], so it is safe to reassign
		// But for sub databases it must be initialized to array of DBs
		// So to always have DBs under this constructor
		// This is the part of the structure to support multiple DBs connected to the same base
		// See fetchDB for details, it is base DB for remote access over fetch
		// And DB is base local storage interface
		// Then attach another DB instances, that will be initialized with the root
		this.dbs = dbs.map(from => DB.from(from))
		if (!this.dbs.every(d => d instanceof DB)) {
			throw new Error("Not all items in dbs are DB instances")
		}
	}

	/**
	 * Returns whether the database directory has been loaded
	 * @returns {boolean}
	 * Returns state of ?loaded marker in meta Map
	 * After .connect() and .readDir() the marker is placed as {mtime: true}
	 * Because we can load only once when depth=0, and every subsequent .readBranch() is depth>0
	 * and works with fully loaded DocumentEntry or DocumentStat data
	 */
	get loaded() {
		return this.meta.has("?loaded")
	}

	/**
	 * Returns Data helper class that is assign to DB or its extension.
	 * Define your own Data provider to extend its logic, no need to extend getter.
	 * ```js
	 * class DataExtended extends DB {
	 *   static OBJECT_DIVIDER = "."
	 * }
	 * class DBExtended extends DB {
	 *   static Data = DataExtended
	 * }
	 * ```
	 * @returns {typeof Data}
	 */
	get Data() {
		return /** @type {typeof DB} */ (this.constructor).Data
	}
	/**
	 * Returns static.Directory that is assign to DB or its extension.
	 * Define your own static.Directory, no need to extend getter.
	 * ```js
	 * class DirectoryExtended extends Directory {
	 *   static FILE = "$"
	 *   static DATA_EXTNAMES = [".md", ".csv"]
	 * }
	 * class DBExtended extends DB {
	 *   static Directory = DirectoryExtended
	 * }
	 * ```
	 * @returns {typeof Directory}
	 */
	get Directory() {
		return /** @type {typeof DB} */ (this.constructor).Directory
	}
	/**
	 * Returns static.GetOpts that is assign to DB or its extension.
	 * Define your own static.GetOpts, no need to extend getter.
	 * ```js
	 * class GetOptsExtended extends GetOpts {
	 *   defaultValue = ""
	 * }
	 * class DBExtended extends DB {
	 *   static GetOpts = GetOptsExtended
	 * }
	 * ```
	 * @returns {typeof GetOpts}
	 */
	get GetOpts() {
		return /** @type {typeof DB} */ (this.constructor).GetOpts
	}
	/**
	 * Attaches another DB instance
	 * @param {DB} db - Database to attach
	 * @returns {void}
	 */
	attach(db) {
		if (!(db instanceof DB)) {
			throw new TypeError("It is possible to attach only DB or extended databases")
		}
		this.dbs.push(db)
	}

	/**
	 * Detaches a database
	 * @param {DB} db - Database to detach
	 * @returns {DB[]|boolean} Array of detached database or false if not found
	 */
	detach(db) {
		const index = this.dbs.findIndex((d) => d.root === db.root && d.cwd === db.cwd)
		if (index < 0) {
			return false
		}
		return this.dbs.splice(index, 1)
	}

	/**
	 * Creates a new DB instance with a subset of the data and meta.
	 * @param {string} uri The URI to extract from the current DB.
	 * @returns {DB}
	 */
	extract(uri) {
		const root = String("." === this.root ? "" : this.root + "/").replace(/\/{2,}/g, "/")
		const Class = /** @type {typeof DB} */ (this.constructor)
		const prefix = String(uri).replace(/\/+$/, '') + "/"
		return new Class({
			root: root + uri,
			data: new Map(Array.from(this.data.entries()).filter(
				([key]) => key.startsWith(prefix)
			).map(([key, value]) => [key.replace(prefix, ""), value])),
			meta: new Map(Array.from(this.meta.entries()).filter(
				([key]) => key.startsWith(prefix)
			).map(([key, value]) => [key.replace(prefix, ""), value])),
		})
	}

	/**
	 * Extracts file extension with leading dot from URI
	 * For example 'file.txt' -> '.txt'
	 * @param {string} uri
	 * @returns {string}
	 */
	extname(uri) {
		const arr = uri.split(".")
		return arr.length > 1 ? `.${arr.pop()}` : ""
	}

	/**
	 * Relative path resolver for file systems.
	 * Must be implemented by platform specific code
	 * @throws Not implemented in base class
	 * @param {string} from Base directory path
	 * @param {string} to Target directory path
	 * @returns {string} Relative path
	 */
	relative(from, to) {
		throw new Error("Not implemented")
	}

	/**
	 * Get string representation of the database
	 * @returns {string}
	 */
	toString() {
		return this.constructor.name + " " + this.root + " [" + this.encoding + "]"
	}

	/**
	 * Reading the current directory or branch as async generator to follow progress.
	 * For FetchDB it is loading of "index.txt" or "manifest.json".
	 * For NodeFsDB it is loading readdirSync in a conditional recursion.
	 * @async
	 * @generator
	 * @param {string} uri
	 * @param {object} options
	 * @param {number} [options.depth=0] Depth to read recursively
	 * @param {boolean} [options.skipStat=false] Skip collecting statistics
	 * @param {boolean} [options.skipSymbolicLink=false] Skip symbolic links
	 * @param {Function} [options.filter=identity] Filter by pattern or callback
	 * @yields {DocumentEntry}
	 * @returns {AsyncGenerator<DocumentEntry, void, unknown>}
	 */
	async *readDir(uri = ".", options = {}) {
		const {
			depth = 0,
			skipStat = false,
			skipSymbolicLink = false,
			filter = (uri) => true,
		} = options
		await this.ensureAccess(uri, "r")
		if (!filter(new FilterString(uri))) {
			return
		}
		const stat = await this.statDocument(uri)
		if (stat.isDirectory) {
			const entries = await this.listDir(uri, { depth, skipStat, skipSymbolicLink })
			const later = []
			for (const entry of entries) {
				let path = await this.resolve(uri, entry.name)
				if (!filter(new FilterString(path))) {
					continue
				}
				this.data.set(path, false)
				this.meta.set(path, entry.stat)
				const element = new DocumentEntry({ name: entry.name, stat: entry.stat, depth, path })
				if (entry.stat.isDirectory) {
					yield element
				} else {
					later.push(element)
				}
			}
			for (const entry of later) {
				yield entry
			}
			for (const entry of entries) {
				if (skipSymbolicLink && entry.stat.isSymbolicLink) {
					continue
				}
				if (entry.stat.isDirectory) {
					const path = await this.resolve(uri, entry.name)
					yield* this.readDir(path, { depth: depth + 1, skipStat, skipSymbolicLink, filter })
				}
			}
		} else {
			const name = this.relative(this.root, uri)
			this.data.set(uri, false)
			this.meta.set(uri, stat)
			if (filter(new FilterString(uri))) {
				yield new DocumentEntry({ name, stat, depth, path: uri })
			}
		}
	}

	/**
	 * Reads a specific branch at given depth
	 * @param {string} uri - URI for the branch
	 * @param {number} [depth=-1] - Depth of read
	 * @returns {Promise<AsyncGenerator<DocumentEntry, void, unknown>>}
	 */
	async readBranch(uri, depth = -1) {
		return this.readDir(uri, { depth })
	}

	/**
	 * Ensures DB is connected
	 * @returns {Promise<void>}
	 */
	async requireConnected() {
		if (!this.connected) {
			await this.connect()
		}
		if (!this.connected) {
			throw new Error("DB is not connected")
		}
	}

	/**
	 * Searches for URI matching condition
	 * @param {string | ((key: string, value: any) => boolean)} uri - Search pattern or callback
	 * @param {number} [depth=0] - Maximum depth to search
	 * @yields {string} Full URI path of found documents
	 * @returns {AsyncGenerator<string, void, unknown>}
	 */
	async *find(uri, depth = 0) {
		await this.requireConnected()
		if (!this.loaded) {
			for await (const element of this.readDir(this.root, { depth: depth + 1 })) {
				yield element.path
			}
			this.meta.set("?loaded", new DocumentStat())
		}
		if ("function" === typeof uri) {
			for (const [key, value] of this.data) {
				if (uri(key, value)) {
					yield key
				}
			}
		} else {
			if (this.data.has(uri)) {
				yield uri
			}
		}
	}

	/**
	 * Connect to database
	 * @abstract
	 * @returns {Promise<void>}
	 * Platform specific implementation of connecting to the database
	 */
	async connect() {
		this.connected = true
	}

	/**
	 * Gets document content
	 * @param {string} uri - Document URI
	 * @param {object | GetOpts} [opts] - Options.
	 * @returns {Promise<any>} Document content
	 */
	async get(uri, opts = new this.GetOpts()) {
		opts = this.GetOpts.from(opts)
		if (uri.startsWith("/")) uri = uri.slice(1)
		await this.ensureAccess(uri, "r")
		if (!this.data.has(uri) || false === this.data.get(uri)) {
			const data = await this.loadDocument(uri, opts.defaultValue)
			this.data.set(uri, data)
		}
		return this.data.get(uri)
	}

	/**
	 * Sets document content
	 * @param {string} uri - Document URI
	 * @param {any} data - Document data
	 * @returns {Promise<any>} Document content
	 */
	async set(uri, data) {
		await this.ensureAccess(uri, "w")
		this.data.set(uri, data)
		const meta = this.meta.has(uri) ? this.meta.get(uri) : {}
		this.meta.set(uri, new DocumentStat({ ...meta, mtimeMs: Date.now() }))
		return data
	}

	/**
	 * Gets document statistics
	 * @param {string} uri - Document URI
	 * @returns {Promise<DocumentStat | undefined>}
	 */
	async stat(uri) {
		await this.ensureAccess(uri, "r")
		if (!this.meta.has(uri)) {
			const stat = await this.statDocument(uri)
			this.meta.set(uri, stat)
		}
		return this.meta.get(uri)
	}

	/**
	 * Resolves path segments to absolute path
	 * @note Must be overwritten by platform-specific implementation
	 * @param  {...string} args - Path segments
	 * @returns {Promise<string>} Resolved absolute path
	 */
	async resolve(...args) {
		return args.filter(Boolean).join("/")
	}

	normalize(...args) {
		const segments = args.filter(Boolean).join("/").split("/")
		const normalizedSegments = []

		for (const segment of segments) {
			if (segment === "..") {
				normalizedSegments.pop()
			} else if (segment !== ".") {
				normalizedSegments.push(segment)
			}
		}

		return normalizedSegments.join("/")
	}

	/**
	 * Resolves path segments to absolute path synchronously
	 * @param  {...string} args - Path segments
	 * @returns {string} Resolved absolute path
	 */
	resolveSync(...args) {
		return this.normalize(...args)
	}

	/**
	 * Gets absolute path
	 * @note Must be overwritten by platform-specific implementation
	 * @param  {...string} args - Path segments
	 * @returns {string} Absolute path
	 */
	absolute(...args) {
		let path = this.resolveSync(this.cwd, this.root, ...args)
		return path.startsWith("/") ? path : "/" + path
	}

	/**
	 * Loads a document
	 * @param {string} uri - Document URI
	 * @param {any} [defaultValue=""] - Default value if document not found
	 * @returns {Promise<any>}
	 */
	async loadDocument(uri, defaultValue = "") {
		await this.ensureAccess(uri, "r")
		throw new Error("Not implemented")
	}

	/**
	 * Saves a document
	 * @param {string} uri - Document URI
	 * @param {any} document - Document data
	 * @returns {Promise<boolean>}
	 */
	async saveDocument(uri, document) {
		await this.ensureAccess(uri, "w")
		throw new Error("Not implemented")
	}

	/**
	 * Creates DocumentStat for a specific document
	 * @note Must be overwritten by platform-specific implementation
	 * @param {string} uri - Document URI
	 * @returns {Promise<DocumentStat>}
	 */
	async statDocument(uri) {
		await this.ensureAccess(uri)
		throw new Error("Not implemented")
	}

	/**
	 * Writes data to a document with overwrite
	 * @param {string} uri - Document URI
	 * @param {string} chunk - Data to write
	 * @returns {Promise<boolean>} Success status
	 */
	async writeDocument(uri, chunk) {
		await this.ensureAccess(uri, "w")
		return false
	}

	/**
	 * Delete document from storage
	 * @note Must be overwritten by platform specific application
	 * @param {string} uri - Document URI
	 * @returns {Promise<boolean>}
	 * Always returns false for base implementation not knowing
	 * to implement delete on top of generic interface
	 */
	async dropDocument(uri) {
		await this.ensureAccess(uri, "d")
		return false
	}

	/**
	 * Ensures access for given URI and level
	 * @note Must be overwritten by platform specific application
	 * @param {string} uri - Document URI
	 * @param {string} [level='r'] Access level
	 * @returns {Promise<boolean>}
	 */
	async ensureAccess(uri, level = "r") {
		if (!oneOf("r", "w", "d")(level)) {
			throw new TypeError([
				"Access level must be one of [r, w, d]",
				"r = read",
				"w = write",
				"d = delete",
			].join("\n"))
		}
		return true
	}

	/**
	 * Synchronize data with persistent storage
	 * @param {string|undefined} [uri] Optional specific URI to save
	 * @returns {Promise<string[]>} Array of saved URIs
	 */
	async push(uri = undefined) {
		if (uri) {
			await this.ensureAccess(uri, "w")
		} else {
			for (const [key] of this.data) {
				await this.ensureAccess(key, "w")
			}
		}
		const changed = []
		for (const [key, value] of this.data) {
			const meta = this.meta.get(key) ?? { mtimeMs: 0 }
			const stat = await this.statDocument(key)
			if (meta.mtimeMs > stat.mtimeMs) {
				changed.push(key)
				await this.saveDocument(key, value)
			}
		}
		return changed
	}

	/**
	 * Moves a document from one URI to another URI
	 * @param {string} from - Source URI
	 * @param {string} to - Target URI
	 * @returns {Promise<boolean>} Success status
	 */
	async moveDocument(from, to) {
		await this.ensureAccess(to, "w")
		await this.ensureAccess(from, "r")
		const data = await this.loadDocument(from)
		await this.saveDocument(to, data)
		return true
	}

	/**
	 * Disconnect from database
	 * @returns {Promise<void>}
	 */
	async disconnect() {
		this.connected = false
	}

	/**
	 * Lists directory entries
	 * @param {string} uri - Directory URI
	 * @param {Object} options - List options
	 * @param {number} [options.depth] - Depth to list
	 * @param {boolean} [options.skipStat] - Skip statistics collection
	 * @param {boolean} [options.skipSymbolicLink] - Skip symbolic links
	 * @returns {Promise<{name: string, stat: DocumentStat, isDirectory: boolean}[]>} Directory entries
	 */
	async listDir(uri, { depth = 0, skipStat = false, skipSymbolicLink = false } = {}) {
		throw new Error("Not implemented")
	}

	/**
	 * Push stream of progress state
	 * @param {string} uri - Starting URI
	 * @param {object} options - Stream options
	 * @param {Function} [options.filter] - Filter function
	 * @param {number} [options.limit] - Limit number of entries
	 * @param {'name'|'mtime'|'size'} [options.sort] - Sort criteria
	 * @param {'asc'|'desc'} [options.order] - Sort order
	 * @param {boolean} [options.skipStat] - Skip statistics
	 * @param {boolean} [options.skipSymbolicLink] - Skip symbolic links
	 * @yields {StreamEntry} Progress state
	 * @returns {AsyncGenerator<StreamEntry, void, unknown>}
	 */
	async *findStream(uri, options = {}) {
		const {
			filter = () => true,
			limit = -1,
			sort = "name",
			order = "asc",
			skipStat = false,
			skipSymbolicLink = false,
		} = options
		/** @type {Map<string, DocumentEntry>} */
		let dirs = new Map()
		/** @type {Map<string, DocumentEntry>} */
		let top = new Map()
		/** @type {Map<string, Error | null>} */
		let errors = new Map()

		const sortFn = (a, b) => {
			if (sort === "name") {
				return order === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
			}
			if (sort === "mtime") {
				return order === "asc" ? a.stat.mtime - b.stat.mtime : b.stat.mtime - a.stat.mtime
			}
			if (sort === "size") {
				return order === "asc" ? a.stat.size - b.stat.size : b.stat.size - a.stat.size
			}
			return 0
		}

		/**
		 * !!! INCORRECT PROGRESS CALCULATION !!!
		 * @param {DocumentEntry[]} files
		 * @returns {number}
		 */
		function getProgress(files) {
			let progress = 0

			/** @type {DocumentEntry} */
			const last = files[files.length - 2] ?? null
			const recent = files[files.length - 1]
			if (recent.stat.isDirectory) {
				dirs.set(recent.path, recent)
			} else {
				if ("" !== recent.parent && !dirs.has(recent.parent)) {
					throw new Error(["Directory not found", recent.parent].join(": "))
				}
			}
			if (last?.parent && last.parent !== recent.parent && dirs.has(last.parent)) {
				const dir = dirs.get(last.parent)
				if (dir) {
					dir.fulfilled = true
					const topDir = top.get(dir.name)
					if (topDir) {
						topDir.fulfilled = true
					}
				}
			}
			if (recent.depth > 0) {
				// Calculate progress based on fulfillment of subdirectories the same way as top level directories.
				// Find the top-level directory for this recent file.
				let topLevelDirName = recent.name
				/** @type {DocumentEntry | undefined} */
				let dir = recent
				while (dir?.parent && dirs.has(dir.parent)) {
					dir = dirs.get(dir.parent)
					if (dir) {
						topLevelDirName = dir.name
					}
				}
				// Mark the top-level directory as fulfilled if all its subdirectories are fulfilled.
				if (top.has(topLevelDirName)) {
					const topDir = top.get(topLevelDirName)
					if (topDir) {
						// Find all directories under this top-level directory.
						const subDirs = Array.from(dirs.values()).filter(
							d =>
								d.name !== topLevelDirName &&
								(d.parent === topLevelDirName || d.name.startsWith(topLevelDirName + "/"))
						)
						const allFulfilled =
							subDirs.length > 0 && subDirs.every(d => d.fulfilled)
						if (allFulfilled) {
							topDir.fulfilled = true
						}
					}
				}
				const fulfilledDirs = Array.from(top.values()).filter(dir => dir.fulfilled)
				progress = top.size ? fulfilledDirs.length / top.size : 0
			}
			else if (recent.stat.isDirectory) {
				top.set(recent.name, recent)
			}
			// Calculate progress based on the number of fulfilled directories
			const fulfilledDirs = Array.from(dirs.values()).filter(dir => dir.fulfilled)
			progress = dirs.size ? fulfilledDirs.length / dirs.size : 0
			return progress
		}
		const totalSize = { dirs: 0, files: 0 }

		await this.ensureAccess(uri)

		const files = []
		for await (const file of this.readDir(uri, { skipStat, skipSymbolicLink, filter })) {
			files.push(file)
			if (file.stat.error) {
				errors.set(file.path, file.stat.error)
			}
			if (file.stat.isDirectory) {
				dirs.set(file.path, file)
				totalSize.dirs += file.stat.size
			}
			totalSize.files += file.stat.isFile ? file.stat.size : 0
			const progress = getProgress(files)
			const entry = new StreamEntry({
				file,
				files: files.sort(sortFn),
				dirs,
				top,
				errors,
				progress,
				totalSize,
			})
			yield entry
			if (limit > 0 && files.length >= limit) break
		}
	}

	/**
	 * Creates a new DB instance from properties if object provided
	 * @param {object|DB} props - Properties or DB instance
	 * @returns {DB}
	 */
	static from(props) {
		if (props instanceof DB) return props
		return new this(props)
	}

	/**
	 * Gets inheritance data for a given path
	 * @param {string} path - Document path
	 * @returns {Promise<any>} Inheritance data
	 */
	async getInheritance(path) {
		const segments = path.split('/').filter(segment => segment !== '')
		const inheritanceChain = segments.map((_, index) =>
			segments.slice(0, index + 1).join('/') + '/'
		)

		// Load root inheritance data
		if (!this._inheritanceCache.has('/')) {
			try {
				const rootData = await this.loadDocument(this.Directory.FILE, {})
				this._inheritanceCache.set('/', rootData)
			} catch (err) {
				this._inheritanceCache.set('/', {})
			}
		}
		let mergedData = this._inheritanceCache.get('/') || {}

		for (const dirPath of inheritanceChain) {
			if (!this._inheritanceCache.has(dirPath)) {
				try {
					const dirData = await this.loadDocument(dirPath + this.Directory.FILE, {})
					this._inheritanceCache.set(dirPath, dirData)
				} catch (err) {
					this._inheritanceCache.set(dirPath, {})
				}
			}
			const dirData = this._inheritanceCache.get(dirPath) || {}
			mergedData = this.Data.merge(mergedData, dirData)
		}

		return mergedData
	}

	/**
	 * @param {string} uri
	 * @param {object | FetchOptions} [opts]
	 */
	async fetch(uri, opts = new FetchOptions()) {
		opts = FetchOptions.from(opts)

		// Handle extension-less URIs by trying common extensions
		let ext = this.extname(uri)
		let mightBeDirectory = false

		if (!ext) {
			mightBeDirectory = true
			// Check if this is a directory
			if (opts.allowDirs) {
				try {
					const arr = this.Directory.DATA_EXTNAMES.slice()
					let extname
					do {
						extname = arr.shift()
						const path = uri + "/" + this.Directory.INDEX + extname
						const stat = await this.statDocument(path)
						if (stat.exists) {
							return await this.fetchMerged(path, opts)
						}
					} while (extname)
				} catch (err) {
					// Not a directory, continue with file extensions
				}
			}

			// Try to find a file with one of the supported extensions
			const extsToTry = this.Directory.DATA_EXTNAMES
			for (const extension of extsToTry) {
				const fullUri = uri + extension
				if (this.data.has(fullUri)) {
					return await this.fetchMerged(fullUri, opts)
				}
			}

			// If no file found, return default value
			return opts.defaultValue
		}

		// If extension is not supported, try to load as is
		if (!this.Directory.DATA_EXTNAMES.includes(ext)) {
			try {
				return await this.loadDocument(uri, opts.defaultValue)
			} catch (err) {
				// If loading fails, return default value
				return opts.defaultValue
			}
		}

		// Try to load as file with extension
		try {
			const result = await this.fetchMerged(uri, opts)
			return result
		} catch (err) {
			// If it's a potential directory and directories are allowed, try as directory
			if (mightBeDirectory && opts.allowDirs) {
				try {
					const indexPath = await this.resolve(uri, this.Directory.INDEX + ext)
					if (indexPath === uri) {
						throw new Error("Impossible to have the same directory path as a request uri")
					}
					const result = await this.fetchMerged(indexPath, opts)
					return result
				} catch (indexErr) {
					// If index file doesn't exist, return default value
					return opts.defaultValue
				}
			}
			// Otherwise return default value
			return opts.defaultValue
		}
	}

	/**
	 * Merges data from multiple sources following nano-db-fetch patterns
	 * @param {string} uri - The URI to fetch and merge data for
	 * @param {FetchOptions} [opts] - Fetch options
	 * @returns {Promise<any>} Merged data object
	 */
	async fetchMerged(uri, opts = new FetchOptions()) {
		opts = FetchOptions.from(opts)

		// Load the document first
		let data = await this.get(uri, { defaultValue: opts.defaultValue })

		// Process extensions recursively if enabled
		if (opts.inherit) {
			if (data && typeof data === 'object') {
				const parentUri = await this.resolve(uri, "..", this.Directory.FILE)

				try {
					const parentData = await this.get(parentUri)
					if (parentData && typeof parentData === 'object') {
						// Remove the ref property and merge parent data
						// delete data.$ref
						// Process extensions in parent data recursively
						if (parentUri.includes("/")) {
							const processedParentData = await this.fetchMerged(parentUri, opts)
							// Merge parent data with current data (current data takes precedence)
							data = this.Data.merge(processedParentData, data)
						} else {
							data = this.Data.merge(parentData, data)
						}
					}
				} catch (err) {
					// If parent can't be loaded, keep original data including the $ref property
				}
			}
		}

		// Merge inherited data if enabled
		if (opts.globals) {
			// @todo add similar to getInheritance function to getGlobals()
		}

		// Resolve references if enabled
		if (opts.refs) {
			data = await this.resolveReferences(data, uri)
		}

		return data || opts.defaultValue
	}

	_findReferenceKeys(flat) {
		if (!Array.isArray(flat)) flat = Object.entries(this.Data.flatten(flat))
		const inValue = this.Data.REFERENCE_KEY + ":"
		const inKey = this.Data.REFERENCE_KEY
		const isInKey = key => key.endsWith(this.Data.OBJECT_DIVIDER + inKey) || inKey === key
		return flat.filter(
			([key, val]) => isInKey(key) || "string" === typeof val && val.startsWith(inValue)
		).map(
			([key, val]) => [key, isInKey(key) ? val : val.slice(inValue.length)],
		)
	}

	_getParentReferenceKey(key) {
		const inKey = this.Data.REFERENCE_KEY
		const path = this.Data.OBJECT_DIVIDER + inKey
		return key.endsWith(path) ? key.split(path)[0] : key
	}

	/**
	 * Handles document references and resolves them recursively
	 * @param {object} data - Document data with potential references
	 * @param {string} [basePath] - Base path for resolving relative references
	 * @returns {Promise<object>} Data with resolved references
	 */
	async resolveReferences(data, basePath = '') {
		if (typeof data !== 'object' || data === null) {
			return data
		}
		const flat = this.Data.flatten(data)
		const refKeys = this._findReferenceKeys(flat)

		// Process all references in the data object
		for (const [key, refPath] of refKeys) {
			try {
				// Handle absolute and relative paths
				// const base = basePath ? await this.resolve(basePath)
				const absolutePath = this.absolute(
					refPath.startsWith('/') ? refPath : await this.resolve(basePath, '..', refPath)
				)

				// Handle fragment references like contacts.json#address/zip
				if (absolutePath.includes('#')) {
					const [filePath, fragment] = absolutePath.split('#')
					const fullData = await this.get(filePath)
					const refValue = this.Data.find(fragment.split('/'), fullData)
					flat[key] = refValue
				} else {
					const refValue = await this.get(absolutePath)
					if (undefined !== refValue) {
						let parentKey = this._getParentReferenceKey(key)
						if (parentKey === key) parentKey = ""
						const siblings = this.Data.flatSiblings(Object.entries(flat), key, parentKey).map(
							([k, val]) => parentKey ? [k.slice((parentKey + this.Data.OBJECT_DIVIDER).length), val] : [k, val]
						)

						if (siblings.length > 0) {
							const value = "object" === typeof refValue ? (refValue ?? {}) : { value: refValue }
							if ("" === parentKey) {
								// extend, because of top-level $ref
								delete flat[key]
								for (const [k, v] of Object.entries(value)) {
									flat[k] = v
								}
							} else {
								flat[parentKey] = Object.fromEntries(
									this.Data.mergeFlat(Object.entries(value), siblings)
								)
							}
						} else {
							flat["" === parentKey ? key : parentKey] = refValue
						}
					}
				}
			} catch (err) {
				// If reference can't be resolved, keep original value
				// Don't modify the value, keep it as original reference string
			}
		}

		return this.Data.unflatten(flat)
	}

	/**
	 * Processes document extensions and merges data recursively
	 * @param {object} data - Document data with potential extensions
	 * @param {string} [basePath] - Base path for resolving relative extensions
	 * @returns {Promise<object>} Merged extended data
	 */
	async processExtensions(data, basePath = '') {
		if (typeof data !== 'object' || data === null) {
			return data
		}

		const extendedData = Array.isArray(data) ? [...data] : { ...data }

		if (Array.isArray(extendedData) && "string" === typeof extendedData[0]?.$ref) {
			// @todo complete the array extensnion
		}

		if (extendedData.$ref && typeof extendedData.$ref === 'string') {
			const parentUri = extendedData.$ref.startsWith('/')
				? extendedData.$ref
				: await this.resolve(basePath, '..', extendedData.$ref)
			try {
				const parentData = await this.get(parentUri)
				if ("object" === typeof parentData) {
					// Process extensions in parent data recursively
					const processedParentData = await this.processExtensions(parentData, parentUri)
					// Remove the ref property and merge parent data
					delete extendedData.$ref
					// Merge parent data with current data (current data takes precedence)
					return this.Data.merge(processedParentData, extendedData)
				}
			} catch (err) {
				// If parent can't be loaded, keep original data including the $ref property
			}
			return extendedData
		}

		// Recursively process nested objects for references
		for (const [key, value] of Object.entries(extendedData)) {
			if (typeof value === 'object' && value !== null) {
				extendedData[key] = await this.processExtensions(value, basePath)
			}
		}

		return extendedData
	}
}

export { GetOpts, FetchOptions }

export default DB
