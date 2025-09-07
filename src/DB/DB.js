import { FilterString, oneOf } from "@nan0web/types"
import { NoConsole } from "@nan0web/log"
import Data from "../Data.js"
import Directory from "../Directory.js"
import DirectoryIndex from "../DirectoryIndex.js"
import DocumentStat from "../DocumentStat.js"
import DocumentEntry from "../DocumentEntry.js"
import StreamEntry from "../StreamEntry.js"
import GetOptions from "./GetOptions.js"
import FetchOptions from "./FetchOptions.js"

/**
 * Base database class for document storage and retrieval
 * @class
 */
export default class DB {
	static Data = Data
	static Directory = Directory
	static Index = DirectoryIndex
	static GetOptions = GetOptions
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
	root = "."
	/** @type {string} */
	cwd = "."
	/** @type {DB[]} */
	dbs = []
	/** @type {Map} */
	predefined = new Map()
	/** @type {Console | NoConsole} */
	#console
	/** @type {Map<string, any>} */
	_inheritanceCache = new Map()

	/**
	 * Creates a new DB instance from input object
	 * that can include configuration for:
	 * - root directory,
	 * - working directory,
	 * - data and metadata maps,
	 * - connection status,
	 * - attached databases,
	 * - console for the debug, silent = true by default.
	 *
	 * @param {object} input
	 * @param {string} [input.root="."]
	 * @param {string} [input.cwd="."]
	 * @param {boolean} [input.connected=false]
	 * @param {Map<string, any | false>} [input.data=new Map()]
	 * @param {Map<string, DocumentStat>} [input.meta=new Map()]
	 * @param {Map<string, any>} [input.predefined=new Map()] - Data for memory operations.
	 * @param {DB[]} [input.dbs=[]]
	 * @param {Console | NoConsole} [input.console=new NoConsole()]
	 */
	constructor(input = {}) {
		const {
			root = this.root,
			cwd = this.cwd,
			data = this.data,
			meta = this.meta,
			connected = this.connected,
			dbs = this.dbs,
			predefined = this.predefined,
			console = new NoConsole({ silent: true }),
		} = input
		this.root = root
		this.cwd = cwd
		this.data = data instanceof Map ? data : new Map(data)
		this.meta = meta instanceof Map ? meta : new Map(meta)
		this.#console = console
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
		this.predefined = new Map(predefined)
		this.#console.info("DB instance created", { root: this.root, cwd: this.cwd })
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
		const isLoaded = this.meta.has("?loaded")
		this.#console.debug("DB loaded state checked", { loaded: isLoaded })
		return isLoaded
	}

	/**
	 * Returns constructor options to save and restore database instance later.
	 * @returns {Record<string, any>}
	 */
	get options() {
		this.#console.debug("DB options retrieved", { options: { cwd: this.cwd, root: this.root } })
		return {
			cwd: this.cwd,
			root: this.root,
		}
	}

	/** @returns {Console | NoConsole} */
	get console() {
		return this.#console
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
	 * Returns static.GetOptions that is assign to DB or its extension.
	 * Define your own static.GetOptions, no need to extend getter.
	 * ```js
	 * class GetOptionsExtended extends GetOptions {
	 *   defaultValue = ""
	 * }
	 * class DBExtended extends DB {
	 *   static GetOptions = GetOptionsExtended
	 * }
	 * ```
	 * @returns {typeof GetOptions}
	 */
	get GetOptions() {
		return /** @type {typeof DB} */ (this.constructor).GetOptions
	}
	/**
	 * Attaches another DB instance
	 * @param {DB} db - Database to attach
	 * @returns {void}
	 */
	attach(db) {
		if (!(db instanceof DB)) {
			this.#console.error("Attempted to attach a non-DB instance")
			throw new TypeError("It is possible to attach only DB or extended databases")
		}
		this.dbs.push(db)
		this.#console.info("Database attached", { root: db.root, cwd: db.cwd })
	}

	/**
	 * Detaches a database
	 * @param {DB} db - Database to detach
	 * @returns {DB[]|boolean} Array of detached database or false if not found
	 */
	detach(db) {
		const index = this.dbs.findIndex((d) => d.root === db.root && d.cwd === db.cwd)
		if (index < 0) {
			this.#console.warn("Database not found for detachment", { root: db.root, cwd: db.cwd })
			return false
		}
		const detached = this.dbs.splice(index, 1)
		this.#console.info("Database detached", { root: db.root, cwd: db.cwd })
		return detached
	}

	/**
	 * Creates a new DB instance with a subset of the data and meta.
	 * @param {string} uri The URI to extract from the current DB.
	 * @returns {DB}
	 */
	extract(uri) {
		this.#console.debug("Extracting database at URI", { uri })
		const root = String("." === this.root ? "" : this.root + "/").replace(/\/{2,}/g, "/")
		const Class = /** @type {typeof DB} */ (this.constructor)
		const norm = this.resolveSync(this.root, this.normalize(uri))
		let prefix = String(norm).replace(/\/+$/, '') + "/"
		if (prefix.startsWith("/")) prefix = prefix.slice(1)
		const extractor = entries => new Map(entries.map(([key, value]) => {
			if (key.startsWith(prefix)) {
				return [key, value]
			}
			return false
		}).filter(Boolean))

		return new Class({
			root: root + uri,
			cwd: this.cwd,
			data: extractor(this.data.entries()),
			meta: extractor(this.meta.entries()),
		})
	}

	/**
	 * Extracts file extension with leading dot from URI
	 * For example 'file.txt' -> '.txt'
	 * @param {string} uri
	 * @returns {string}
	 */
	extname(uri) {
		this.#console.debug("Extracting extension from URI", { uri })
		const arr = uri.split(".")
		return arr.length > 1 ? `.${arr.pop()}` : ""
	}

	/**
	 * Relative path resolver for file systems.
	 * Must be implemented by platform specific code
	 * @param {string} from Base directory path
	 * @param {string} to Target directory path
	 * @returns {string} Relative path
	 */
	relative(from, to = this.root) {
		if (from.startsWith("/") && to.startsWith("/")) {
			if (!to.endsWith("/")) to += "/"
			return from.startsWith(to) ? from.substring(to.length) : to
		}
		return to
	}

	/**
	 * Get string representation of the database
	 * @returns {string}
	 */
	toString() {
		const dbString = this.constructor.name + " " + this.root + " [" + this.encoding + "]"
		this.#console.debug("DB string representation generated", { string: dbString })
		return dbString
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
	 * @param {Function} [options.filter] Filter by pattern or callback
	 * @yields {DocumentEntry}
	 * @returns {AsyncGenerator<DocumentEntry, void, unknown>}
	 */
	async *readDir(uri, options = {}) {
		const {
			skipStat = false,
			skipSymbolicLink = false,
			filter,
			depth = 0,
		} = options

		const dirUri = await this.resolve(uri)

		const indexPath = this.resolveSync(dirUri, 'index.jsonl')
		if (depth >= 0 && this.data.has(indexPath)) {
			const index = this.data.get(indexPath)
			const list = Array.isArray(index) ? index : []
			for (const item of list) {
				yield new DocumentEntry(item)
			}
			return
		}

		const indexTxtPath = this.resolveSync(dirUri, 'index.txt')
		if (depth >= 0 && this.data.has(indexTxtPath)) {
			const content = this.data.get(indexTxtPath)
			const index = new DirectoryIndex()
			const list = index.decode(content, DirectoryIndex.ENTRIES_AS_TEXT)
			for (const [name, stat] of list) {
				const path = this.resolveSync(dirUri, name)
				yield new DocumentEntry({ path, name: name, stat: stat })
			}
			if (depth > 0) {
				for (const [name, item] of list) {
					if (item.isDirectory) {
						const subdir = this.resolveSync(dirUri, name)
						yield* this.readDir(subdir, { ...options, depth: depth - 1 })
					}
				}
			}
			return
		}

		try {
			const list = await this.listDir(uri)
			for (const entry of list) {
				const stat = this.meta.get(entry.path)
				yield new DocumentEntry({ stat, path: entry.path })
			}
		} catch (/** @type {any} */err) {
			this.#console.warn(`Failed to list directory: ${dirUri}`, err)
		}
	}

	/**
	 * Reads a specific branch at given depth
	 * @param {string} uri - URI for the branch
	 * @param {number} [depth=-1] - Depth of read
	 * @returns {Promise<AsyncGenerator<DocumentEntry, void, unknown>>}
	 */
	async readBranch(uri, depth = -1) {
		this.#console.debug("Reading branch", { uri, depth })
		return this.readDir(uri, { depth })
	}

	/**
	 * Ensures DB is connected
	 * @returns {Promise<void>}
	 */
	async requireConnected() {
		this.#console.debug("Ensuring database connection")
		if (!this.connected) {
			await this.connect()
		}
		if (!this.connected) {
			this.#console.error("Database connection failed")
			throw new Error("DB is not connected")
		}
		this.#console.info("Database connected successfully")
	}

	/**
	 * Searches for URI matching condition
	 * @param {string | ((key: string, value: any) => boolean)} uri - Search pattern or callback
	 * @param {number} [depth=0] - Maximum depth to search
	 * @yields {string} Full URI path of found documents
	 * @returns {AsyncGenerator<string, void, unknown>}
	 */
	async *find(uri, depth = 0) {
		this.#console.debug("Finding URI", { uri, depth })
		await this.requireConnected()
		if (!this.loaded) {
			this.#console.debug("Loading DB for find operation")
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
		this.#console.info("Connecting to database")
		for (const [key, value] of this.predefined.entries()) {
			this.data.set(key, value)
			const isDir = key.endsWith("/")
			this.meta.set(key, new DocumentStat({
				size: Buffer.byteLength(JSON.stringify(value)),
				mtimeMs: Date.now(),
				isFile: !isDir,
				isDirectory: isDir,
			}))
		}
		for (const [key] of this.meta.entries()) {
			const dir = (this.resolveSync(key, "..") || ".") + "/"
			if (!this.meta.has(dir)) {
				const children = Array.from(this.meta.entries()).filter(
					([m, stat]) => stat.isFile && (m.startsWith(dir + "/") || "." === dir)
				)
				let size = 0
				let mtimeMs = 0
				children.forEach(([, stat]) => {
					size = Math.max(stat.size, size)
					mtimeMs = Math.max(stat.mtimeMs, mtimeMs)
				})
				this.meta.set(dir, new DocumentStat({ size, mtimeMs, isDirectory: true }))
			}
		}
		this.connected = true
		this.#console.info("Database connected")
	}

	/**
	 * Gets document content
	 * @param {string} uri - Document URI
	 * @param {object | GetOptions} [opts] - Options.
	 * @returns {Promise<any>} Document content
	 */
	async get(uri, opts = new this.GetOptions()) {
		opts = this.GetOptions.from(opts)
		uri = this.normalize(uri)
		this.#console.debug("Getting document", { uri })
		await this.ensureAccess(uri, "r")
		if (!this.data.has(uri) || false === this.data.get(uri)) {
			const data = await this.loadDocument(uri, opts.defaultValue)
			this.#console.debug("Loaded (with no cache)", { uri, data })
			this.data.set(uri, data)
			return data
		}
		const data = this.data.get(uri)
		this.#console.debug("Loaded (from cache)", { uri, data })
		return data
	}

	/**
	 * Sets document content
	 * @param {string} uri - Document URI
	 * @param {any} data - Document data
	 * @returns {Promise<any>} Document content
	 */
	async set(uri, data) {
		this.#console.debug("Setting document", { uri })
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
		this.#console.debug("Getting document statistics", { uri })
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
		this.#console.debug("Resolving path", { args })
		return Promise.resolve(this.resolveSync(...args))
	}

	/**
	 * Normalize path segments to absolute path
	 * @param  {...string} args - Path segments
	 * @returns {string} Normalized path
	 */
	normalize(...args) {
		this.#console.debug("Normalizing path", { args })
		let segments = []
		for (const arg of args) {
			if (arg.startsWith("/")) segments = []
			segments.push(arg)
		}
		segments = segments.filter(Boolean).join("/").split("/")
		const norms = []

		let prev
		for (const segment of segments) {
			if (segment === "..") {
				norms.pop()
				if ("" !== prev) norms.pop()
			} else if (![".", ""].includes(segment)) {
				norms.push(segment)
			}
			prev = segment
		}

		return norms.join("/")
	}

	/**
	 * Resolves path segments to absolute path synchronously
	 * @param  {...string} args - Path segments
	 * @returns {string} Resolved absolute path
	 */
	resolveSync(...args) {
		this.#console.debug("Resolving path synchronously", { args })
		return this.normalize(this.cwd, this.root, ...args)
	}

	/**
	 * Gets absolute path
	 * @note Must be overwritten by platform-specific implementation
	 * @param  {...string} args - Path segments
	 * @returns {string} Absolute path
	 */
	absolute(...args) {
		this.#console.debug("Getting absolute path", { args })
		let path = this.resolveSync(this.cwd, this.root, ...args)
		return path.startsWith("/") ? path : "/" + path
	}

	/**
	 * Loads a document.
	 * Must be overwritten to has the proper file or database document read operation.
	 * In a basic class it just loads already saved data in the db.data map.
	 * @param {string} uri - Document URI
	 * @param {any} [defaultValue] - Default value if document not found
	 * @returns {Promise<any>}
	 */
	async loadDocument(uri, defaultValue = undefined) {
		// uri = await this.resolve(uri)
		this.#console.debug("Loading document", { uri })
		uri = this.normalize(uri)
		// const abs = this.absolute(uri)
		let abs = this.absolute(uri)
		if (abs.startsWith("/")) abs = abs.slice(1)
		await this.ensureAccess(abs, "r")
		if (this.data.has(abs)) {
			return this.data.get(abs)
		}
		const extname = this.extname(abs)
		if (!extname) {
			for (const ext of this.Directory.DATA_EXTNAMES) {
				const data = await this.loadDocument(uri + ext, null)
				if (null !== data) {
					return data
				}
			}
		}
		return defaultValue
	}

	/**
	 * Loads a document using a specific extension handler.
	 * @param {string} ext The extension of the document.
	 * @param {string} uri The URI to load the document from.
	 * @param {any} defaultValue The default value to return if the document does not exist.
	 * @returns {Promise<any>} The loaded document or the default value.
	 */
	async loadDocumentAs(ext, uri, defaultValue) {
		this.#console.debug("Loading document as specific extension", { ext, uri })
		return await this.loadDocument(uri, defaultValue)
	}

	/**
	 * Saves a document.
	 * Must be overwritten to has the proper file or database document save operation.
	 * In a basic class it just sets a document in the db.data map and db.meta map.
	 * @param {string} uri - Document URI
	 * @param {any} document - Document data
	 * @returns {Promise<boolean>}
	 */
	async saveDocument(uri, document) {
		this.#console.debug("Saving document", { uri })
		await this.ensureAccess(uri, "w")
		const abs = this.normalize(await this.resolve(uri))
		this.data.set(abs, document)
		const stat = DocumentStat.from(this.meta.get(abs) ?? {})
		stat.isFile = true
		stat.mtimeMs = Date.now()
		stat.size = Buffer.byteLength(JSON.stringify(document))
		this.meta.set(abs, stat)
		return false
	}

	/**
	 * Reads a statisitics into DocumentStat for a specific document.
	 * Must be overwritten to has the proper file or database document stat operation.
	 * In a basic class it just returns a document stat from the db.meta map if exists.
	 * @note Must be overwritten by platform-specific implementation
	 * @param {string} uri - Document URI
	 * @returns {Promise<DocumentStat>}
	 */
	async statDocument(uri) {
		this.#console.debug("Getting document statistics", { uri })
		if ("." === uri) uri = "./"
		await this.ensureAccess(uri)
		const isDir = uri.endsWith("/")
		const abs = (this.normalize(await this.resolve(uri)) || ".") + (isDir ? "/" : "")
		return DocumentStat.from(this.meta.get(abs) ?? {})
	}

	/**
	 * Writes data to a document with overwrite
	 * @param {string} uri - Document URI
	 * @param {string} chunk - Data to write
	 * @returns {Promise<boolean>} Success status
	 */
	async writeDocument(uri, chunk) {
		this.#console.debug("Writing document", { uri })
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
		this.#console.debug("Dropping document", { uri })
		await this.ensureAccess(uri, "d")
		return false
	}

	/**
	 * Ensures access for given URI and level, if not @throws an error.
	 * @note Must be overwritten by platform specific application
	 * @param {string} uri - Document URI
	 * @param {string} [level='r'] Access level
	 * @returns {Promise<void>}
	 */
	async ensureAccess(uri, level = "r") {
		this.#console.debug("Ensuring access", { uri, level })
		if (!oneOf("r", "w", "d")(level)) {
			this.#console.error("Invalid access level", { level })
			throw new TypeError([
				"Access level must be one of [r, w, d]",
				"r = read",
				"w = write",
				"d = delete",
			].join("\n"))
		}
	}

	/**
	 * Synchronize data with persistent storage
	 * @param {string|undefined} [uri] Optional specific URI to save
	 * @returns {Promise<string[]>} Array of saved URIs
	 */
	async push(uri = undefined) {
		this.#console.debug("Pushing data to storage", { uri })
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
		this.#console.info("Data pushed to storage", { changedUris: changed })
		return changed
	}

	/**
	 * Moves a document from one URI to another URI
	 * @param {string} from - Source URI
	 * @param {string} to - Target URI
	 * @returns {Promise<boolean>} Success status
	 */
	async moveDocument(from, to) {
		this.#console.debug("Moving document", { from, to })
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
		this.#console.info("Disconnecting from database")
		this.connected = false
		this.#console.info("Database disconnected")
	}

	/**
	 * Lists immediate entries in a directory by scanning meta keys.
	 * @param {string} uri - The directory URI (e.g., "content", ".", "dir/")
	 * @returns {Promise<DocumentEntry[]>}
	 * @throws {Error} If directory does not exist
	 */
	async listDir(uri) {
		const prefix = uri === '.' ? '' : uri.endsWith("/") ? uri : uri + '/'
		const keys = Array.from(this.data.keys())
		const filtered = keys.filter(
			key => key.startsWith(prefix) && key.indexOf('/', prefix.length) === -1
		)
		return filtered.map(path => {
			const stat = this.meta.get(path) || new DocumentStat({ isFile: true, mtimeMs: Date.now() })
			return new DocumentEntry({ path, stat })
		})
	}

	/**
	 * Push stream of progress state
	 * @param {string} uri - Starting URI
	 * @param {object} options - Stream options
	 * @param {Function} [options.filter] - Filter function
	 * @param {number} [options.limit] - Limit number of entries
	 * @param {'name'|'mtime'|'size'} [options.sort] - The sort criteria
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
		this.#console.debug("Finding stream", { uri, options })
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
	 * Gets inheritance data for a given path
	 * @param {string} path - Document path
	 * @returns {Promise<any>} Inheritance data
	 */
	async getInheritance(path) {
		this.#console.debug("Getting inheritance data", { path })
		const inheritanceChain = this.Data.getPathParents(path, "/")

		// Load root inheritance data
		if (!this._inheritanceCache.has('/')) {
			try {
				const rootData = await this.loadDocument(this.Directory.FILE, {})
				this._inheritanceCache.set('/', rootData)
				this.#console.debug("Root inheritance data loaded")
			} catch (/** @type {any} */ err) {
				this.#console.warn("Failed to load root inheritance data", { error: err.message })
				this._inheritanceCache.set('/', {})
			}
		}
		let mergedData = this._inheritanceCache.get('/') || {}

		for (const dirPath of inheritanceChain) {
			if (!this._inheritanceCache.has(dirPath)) {
				try {
					const dirData = await this.loadDocument(dirPath + this.Directory.FILE, {})
					this._inheritanceCache.set(dirPath, dirData)
					this.#console.debug("Directory inheritance data loaded", { dirPath })
				} catch (/** @type {any} */ err) {
					this.#console.warn("Failed to load directory inheritance data", { dirPath, error: err.message })
					this._inheritanceCache.set(dirPath, {})
				}
			}
			const dirData = this._inheritanceCache.get(dirPath) || {}
			mergedData = this.Data.merge(mergedData, dirData)
		}

		this.#console.debug("Inheritance data merged", { path, mergedData })
		return mergedData
	}

	/**
	 * Gets global variables for a given path, global variables are stored in _/ subdirectory
	 * @param {string} path - Document path
	 * @returns {Promise<any>} Global variables data
	 */
	async getGlobals(path) {
		this.#console.debug("Getting global variables", { path })
		let globals = {}

		try {
			const paths = this.Data.getPathParents(path, "/" + this.Directory.GLOBALS)
			for (let uri of paths) {
				if (uri.startsWith("/")) uri = uri.slice(1)
				const stream = this.readDir(uri)
				for await (const entry of stream) {
					// Only process files (not directories) in the _/ directory
					if (entry.isFile) {
						const key = this.resolveSync(uri, entry.name)
						const value = await this.loadDocument(key)
						if (undefined !== value) {
							globals[entry.name] = value
						}
					}
				}
			}
		} catch (/** @type {any} */ err) {
			this.#console.warn("Error reading global variables directory", { path, error: err.message })
			// If no _/ directory or error reading it, continue with empty object
		}

		this.#console.debug("Global variables collected", { path, globals })
		return globals
	}

	/**
	 * Fetch document with inheritance, globals and references processing
	 * @param {string} uri
	 * @param {object | FetchOptions} [opts]
	 * @returns {Promise<any>}
	 */
	async fetch(uri, opts = new FetchOptions()) {
		this.#console.debug("Fetching document", { uri, opts })
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
						const path = this.resolveSync(uri, this.Directory.INDEX + extname)
						const stat = await this.statDocument(path)
						if (stat.exists) {
							return await this.fetchMerged(path, opts)
						}
					} while (extname)
				} catch (/** @type {any} */ err) {
					this.#console.warn("Error checking if URI is directory", { uri, error: err.message })
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
			this.#console.debug("Document not found, returning default value", { uri })
			return opts.defaultValue
		}

		// If extension is not supported, try to load as is
		if (!this.Directory.DATA_EXTNAMES.includes(ext)) {
			try {
				return await this.loadDocumentAs(".txt", uri, opts.defaultValue)
			} catch (/** @type {any} */ err) {
				// If loading fails, return default value
				this.#console.warn("Error loading document with unsupported extension", { uri, error: err.message })
				return opts.defaultValue
			}
		}

		// Try to load as file with extension
		try {
			const result = await this.fetchMerged(uri, opts)
			return result
		} catch (/** @type {any} */ err) {
			// If it's a potential directory and directories are allowed, try as directory
			if (mightBeDirectory && opts.allowDirs) {
				try {
					const indexPath = await this.resolve(uri, this.Directory.INDEX + ext)
					if (indexPath === uri) {
						throw new Error("Impossible to have the same directory path as a request uri")
					}
					const result = await this.fetchMerged(indexPath, opts)
					return result
				} catch (/** @type {any} */ indexErr) {
					// If index file doesn't exist, return default value
					this.#console.warn("Index file not found for directory", { uri, error: indexErr.message })
					return opts.defaultValue
				}
			}
			// Otherwise return default value
			this.#console.warn("Error fetching document", { uri, error: err.message })
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
		this.#console.debug("Fetching and merging document", { uri, opts })
		opts = FetchOptions.from(opts)

		// Load the document first
		let data = await this.get(uri, { defaultValue: opts.defaultValue })

		// Process extensions recursively if enabled
		if (opts.inherit) {
			if (data && typeof data === 'object') {
				let parentUri = await this.resolve(uri, "..", this.Directory.FILE)
				if (parentUri.startsWith("/")) parentUri = parentUri.slice(1)

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
				} catch (/** @type {any} */ err) {
					this.#console.warn("Error processing inheritance", { parentUri, error: err.message })
					// If parent can't be loaded, keep original data including the $ref property
				}
			}
		}

		// Merge global variables if enabled
		if (opts.globals) {
			const globals = await this.getGlobals(uri)
			data = this.Data.merge(globals, data)
			this.#console.debug("Globals merged into data", { uri, globals })
		}

		// Resolve references if enabled
		if (opts.refs) {
			data = await this.resolveReferences(data, uri)
		}

		this.#console.debug("Document fetch merged completed", { uri, data })
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
		this.#console.debug("Resolving references", { basePath, data })
		if (typeof data !== 'object' || data === null) {
			return data
		}
		const flat = this.Data.flatten(data)
		const refKeys = this._findReferenceKeys(flat)

		// Process all references in the data object
		for (const [key, refPath] of refKeys) {
			try {
				// Normalize refPath: it may be a string or an object like { $ref: 'file.json' }
				let refString = refPath
				if (typeof refPath === 'object' && refPath !== null && this.Data.REFERENCE_KEY in refPath) {
					refString = refPath[this.Data.REFERENCE_KEY]
				}
				if (typeof refString !== 'string') {
					// If still not a string, skip processing this reference
					this.#console.warn("Invalid reference type, skipping", { key, refPath })
					continue
				}
				// Handle absolute and relative paths
				const abs = this.normalize(
					refString.startsWith('/') ? refString : await this.resolve(basePath, '..', refString)
				)

				// Handle fragment references like contacts.json#address/zip
				if (abs.includes('#')) {
					const [filePath, fragment] = abs.split('#')
					const fullData = await this.get(filePath)
					const refValue = this.Data.find(fragment.split('/'), fullData)
					flat[key] = refValue
					this.#console.debug("Fragment reference resolved", { key, filePath, fragment })
				} else {
					const refValue = await this.get(abs)
					if (undefined !== refValue) {
						let parentKey = this._getParentReferenceKey(key)
						if (parentKey === key) parentKey = ''
						/**
						 * @type {Array<Array<string, any>>}
						 */
						const siblings = this.Data.flatSiblings(Object.entries(flat), key, parentKey).map(
							([k, val]) => parentKey ? [k.slice((parentKey + this.Data.OBJECT_DIVIDER).length), val] : [k, val]
						)

						let clearKeys = ""
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
								clearKeys = parentKey
							}
						} else {
							clearKeys = "" === parentKey ? key : parentKey
							flat[clearKeys] = refValue
						}
						if (clearKeys) {
							Object.keys(flat).filter(
								k => k.startsWith(clearKeys + this.Data.OBJECT_DIVIDER)
							).map(k => delete flat[key])
						}
					}
				}
			} catch (/** @type {any} */ err) {
				this.#console.warn("Error resolving reference", { key, basePath, error: err.message })
				// If reference can't be resolved, keep original value
				// Don't modify the value, keep it as original reference string or object
			}
		}

		const resolvedData = this.Data.unflatten(flat)
		this.#console.debug("References resolved", { basePath, resolvedData })
		return resolvedData
	}

	/**
	 * Creates a new DB instance from properties if object provided
	 * @param {object|DB} input - Properties or DB instance
	 * @returns {DB}
	 */
	static from(input) {
		if (input instanceof DB) {
			return input
		}
		return new this(input)
	}
}
