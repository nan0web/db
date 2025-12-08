import { clone, merge, oneOf } from "@nan0web/types"
import { NoConsole } from "@nan0web/log"
import Data from "../Data.js"
import Directory from "../Directory.js"
import DirectoryIndex from "../DirectoryIndex.js"
import DocumentStat from "../DocumentStat.js"
import DocumentEntry from "../DocumentEntry.js"
import StreamEntry from "../StreamEntry.js"
import GetOptions from "./GetOptions.js"
import FetchOptions from "./FetchOptions.js"
import AuthContext from "./AuthContext.js"
import DBDriverProtocol from "./DriverProtocol.js"
import { absolute, basename, dirname, extname, isAbsolute, isRemote, normalize, relative, resolveSync } from "./path.js"

class TTLMap extends Map {
	/**
	 * @param {number} ttl - Cache life time in miliseconds.
	 */
	constructor(ttl) {
		super()
		this.ttl = ttl
	}
	/**
	 * @param {any} key
	 * @param {any} value
	 */
	set(key, value) {
		super.set(key, { value, expires: this.ttl ? Date.now() + this.ttl : 0 })
		return this
	}
	/**
	 * @param {any} key
	 * @returns {any}
	 */
	get(key) {
		const entry = super.get(key)
		if (undefined === entry) {
			return undefined
		}
		if (Date.now() > entry.expires) {
			super.delete(key)
			return undefined
		}
		return entry.value
	}
}

/**
 * Base database class for document storage and retrieval.
 * Provides core functionality for managing documents, metadata, and directory operations.
 * Supports inheritance, global variables, and reference resolution through the `fetch` method.
 * Designed to be extended for specific storage backends (e.g., filesystem, browser, remote APIs).
 *
 * Key features:
 * - URI-based path resolution and normalization
 * - Caching via in-memory Maps for data and metadata
 * - Access control via driver protocol with AuthContext
 * - Hierarchical directory traversal with indexing support
 * - Data merging with reference handling using the Data utility class
 *
 * Usage example:
 * ```js
 * const context = new AuthContext({ role: 'user' })
 * const db = new DB({ cwd: 'https://api.example.com', root: 'v1', context })
 * await db.connect()
 * const data = await db.fetch('users/profile', undefined)
 * await db.set('users/profile', { name: 'John' })
 * await db.push(ctx)
 * ```
 *
 * Extensibility:
 * - Override `loadDocument`, `saveDocument`, `statDocument` for custom storage
 * - Attach multiple DB instances for federated access
 * - Use `extract(uri)` to create sub-databases for isolated scopes
 *
 * @class
 * @extends {DBDriverProtocol} - Optional driver for access control
 */
export default class DB {
	static Data = Data
	static Directory = Directory
	static Driver = DBDriverProtocol
	static Index = DirectoryIndex
	static GetOptions = GetOptions
	static FetchOptions = FetchOptions
	static DATA_EXTNAMES = [".json", ".yaml", ".yml", ".nano", ".html", ".xml", ".md"]
	/** @type {DBDriverProtocol} */
	driver
	/** @type {string} */
	encoding = "utf-8"
	/** @type {Map<string, any | false>} */
	data = new Map()
	/** @type {Map<string, DocumentStat>} */
	meta = new Map()
	/** @type {number} */
	ttl = 0
	/** @type {AuthContext} */
	context = new AuthContext()
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
	 * - auth context for access control.
	 *
	 * @param {object} input
	 * @param {string} [input.cwd="."] - Current working directory (base for absolute paths)
	 * @param {string} [input.root="."] - Root path for URI resolution
	 * @param {DBDriverProtocol} [input.driver=new DBDriverProtocol()] - Access control driver
	 * @param {boolean} [input.connected=false] - Connection status
	 * @param {Map<string, any | false>} [input.data=new Map()] - In-memory data cache
	 * @param {Map<string, DocumentStat>} [input.meta=new Map()] - Metadata cache
	 * @param {number} [input.ttl=0] - Cache life time.
	 * @param {AuthContext | object} [input.context=new AuthContext()] - Authentication/authorization context
	 * @param {Map<string, any> | Array<readonly [string, any]>} [input.predefined=new Map()] - Data for memory operations.
	 * @param {DB[]} [input.dbs=[]] - Attached sub-databases
	 * @param {Console | NoConsole} [input.console=new NoConsole()] - Logging console
	 */
	constructor(input = {}) {
		const {
			cwd = this.cwd,
			root = this.root,
			driver,
			data = this.data,
			meta = this.meta,
			context = this.context,
			connected = this.connected,
			dbs = this.dbs,
			predefined = this.predefined,
			ttl = this.ttl,
			console: consoleInput = new NoConsole({ silent: true }),
		} = input
		this.root = root
		this.cwd = cwd
		this.driver = this.Driver.from(driver ?? { cwd, root })
		this.ttl = Number(ttl || 0)
		this.data = new TTLMap(this.ttl)
		this.meta = new TTLMap(this.ttl)
		this.data = data instanceof Map ? data : new Map(data)
		this.meta = meta instanceof Map ? meta : new Map(meta)
		this.context = AuthContext.from(context)
		this.#console = consoleInput
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
		this.predefined = predefined instanceof Map ? predefined : new Map(predefined)
		this.console.info("DB instance created", String(this))
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
	 * Returns constructor options to save and restore database instance later.
	 * @returns {Record<string, any>}
	 */
	get options() {
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
	 * Returns Data helper class that is assigned to DB or its extension.
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
	 * Returns static.Directory that is assigned to DB or its extension.
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
	 * Returns static.Driver that is assigned to DBDriverProtocol or its extension
	 * @returns {typeof DBDriverProtocol}
	 */
	get Driver() {
		return /** @type {typeof DB} */ (this.constructor).Driver
	}
	/**
	 * @returns {typeof DirectoryIndex}
	 */
	get Index() {
		return /** @type {typeof DB} */ (this.constructor).Index
	}
	/**
	 * Returns static.GetOptions that is assigned to DB or its extension.
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
	 * @param {string} abs
	 * @returns {DocumentStat}
	 */
	_statFromMeta(abs) {
		const isFile = undefined !== this.data.get(abs)
		const mtimeMs = isFile ? Date.now() : 0
		return DocumentStat.from(this.meta.get(abs) ?? { isFile, mtimeMs })
	}

	isRoot(dir) {
		return ["/", ".", "./", ""].includes(dir)
	}
	/**
	 * Attaches another DB instance to this database for federated access.
	 * Allows routing operations across multiple databases.
	 * @param {DB} db - Database to attach
	 * @returns {void}
	 * @throws {TypeError} If non-DB instance is provided
	 */
	attach(db) {
		if (!(db instanceof DB)) {
			this.console.error("Attempted to attach a non-DB instance")
			throw new TypeError("It is possible to attach only DB or extended databases")
		}
		this.dbs.push(db)
		this.console.info("Database attached", { root: db.root, cwd: db.cwd })
	}

	/**
	 * Detaches a database instance from this database.
	 * @param {DB} db - Database to detach
	 * @returns {DB[]|boolean} Array of detached database or false if not found
	 */
	detach(db) {
		const index = this.dbs.findIndex((d) => d.root === db.root && d.cwd === db.cwd)
		if (index < 0) {
			this.console.warn("Database not found for detachment", { root: db.root, cwd: db.cwd })
			return false
		}
		const detached = this.dbs.splice(index, 1)
		this.console.info("Database detached", { root: db.root, cwd: db.cwd })
		return detached
	}

	/**
	 * Creates a new DB instance with a subset of the data and meta,
	 * scoped to a specific URI prefix.
	 *
	 * The returned database works as if the supplied `uri` were its
	 * virtual root:
	 *   - `root` property reflects the new virtual root (`.../uri/`).
	 *   - `cwd` is inherited from the parent so that `absolute()` still
	 *     produces full URLs.
	 *   - `resolveSync()` is overridden to return paths **relative** to the
	 *     extracted root (i.e. the prefix is stripped).
	 *
	 * @param {string} uri The URI to extract from the current DB.
	 * @returns {DB} New DB instance with filtered data and metadata.
	 */
	extract(uri) {
		this.console.debug("extract()", uri)

		const prefix = (this.normalize(uri) + "/").replace(/\/{2,}$/, "/")

		const Class = /** @type {typeof DB} */ (this.constructor)

		const extractor = entries => new Map(
			Array.from(entries)
				.filter(([key]) => key.startsWith(prefix))
				.map(([key, value]) => [String(key.substring(prefix.length) || "."), value])
		)

		let cwd = this.absolute(uri)

		const data = extractor(this.data.entries())
		const meta = extractor(this.meta.entries())

		const db = new Class({
			cwd,
			data,
			meta,
			console: this.console,
		})

		this.console.debug("extract().done", uri, { db })
		return db
	}

	/**
		 * Extracts file extension with leading dot from URI
		 * @param {string} uri
		 * @returns {string} Extension (e.g., ".txt") or empty string
		 * @example
		 * db.extname("file.TXT") // => .txt
		 */
	extname(uri) {
		return extname(uri)
	}

	/**
	 * Relative path resolver for file systems.
	 * Must be implemented by platform specific code
	 * @param {string} from Base directory path
	 * @param {string} [to=this.root] Target directory path
	 * @returns {string} Relative path
	 */
	relative(from, to = this.root) {
		return relative(from, to)
	}

	/**
	 * Get string representation of the database
	 * @returns {string} Formatted string like "DB /root [utf-8]"
	 */
	toString() {
		return this.constructor.name + " " + this.root + " [" + this.encoding + "]"
	}

	/**
	 * Dumps current database into destination database.
	 * Copies all documents and builds indexes in the destination.
	 * @param {DB} dest - Destination database
	 * @param {object} [options]
	 * @param {({ uri, url, data, current, total }) => void} [options.onProgress] - Progress callback
	 * @returns {Promise<{ total: number, processed: number, ignored: number, updatedURIs: string[] }>}
	 */
	async dump(dest, options = {}) {
		const { onProgress = () => { } } = options
		const total = this.meta.size
		let current = 0
		const updatedURIs = []
		for (const [uri, stat] of this.meta.entries()) {
			if (!stat.isFile) continue
			const data = await this.loadDocument(uri)
			current++
			try {
				let ext = this.extname(uri)
				if (this.isData(uri) && !dest.isData(uri)) {
					ext = dest.Directory.DATA_EXTNAMES[0] ?? ".json"
				}
				const url = this.resolveSync(this.dirname(uri), this.basename(uri, true) + ext)
				await dest.saveDocument(url, data)
				updatedURIs.push(url)
				onProgress({ uri, url, data, current, total })
				this.console.info(`Document dumped [${uri}]`, { data })
			} catch (/** @type {any} */ error) {
				this.console.error(`Failed to dump document [${uri}]`, { error: error.message })
			}
		}
		return {
			total,
			processed: updatedURIs.length,
			ignored: total - updatedURIs.length,
			updatedURIs
		}
	}

	/**
	 * Build indexes inside the directory.
	 * Generates `index.txt` and `index.txtl` files for efficient traversal.
	 * @param {string} dir - Directory URI (default: '.')
	 * @returns {Promise<void>}
	 */
	async buildIndexes(dir = '.') {
		const stream = this.Index.generateAllIndexes(this, dir)
		for await (const [uri, index] of stream) {
			if (this.Index.isFullIndex(uri)) {
				await this.saveDocument(uri, index.encode({ long: true, inc: true }))
			}
			else {
				await this.saveDocument(uri, index.encode())
			}
		}
	}

	/**
	 *
	 * @param {string} dirPath The directory path.
	 * @param {Array<[string, DocumentStat]>} [entries=[]] Entries to extend with the files found.
	 * @param {number} [depth=0] The depth level.
	 * @returns
	 */
	async _buildRecursiveDirectoryTree(dirPath, entries = [], depth = 0) {
		const immediateEntries = await DirectoryIndex.getDirectoryEntries(this, dirPath)

		for (const [name, stat] of immediateEntries) {
			const fullPath = dirPath === '.' ? name : this.resolveSync(dirPath, name)
			const entryStat = {
				...stat,
				depth,
				name: fullPath
			}

			entries.push([fullPath, new DocumentStat(entryStat)])

			if (name.endsWith('/') && name !== '.') {
				await this._buildRecursiveDirectoryTree(fullPath, entries, depth + 1)
			}
		}

		return entries
	}

	/**
	 * Reads the content of a directory at the specified URI.
	 * For FetchDB it loads index.txt or manifest.json.
	 * For NodeFsDB it uses readdirSync recursively.
	 *
	 * Supports filtering, depth limiting, and skipping stats/indexes for performance.
	 *
	 * @async
	 * @generator
	 * @param {string} uri - The URI of the directory to read
	 * @param {object} [options] - Read directory options
	 * @param {AuthContext | object} [options.context] - Auth context
	 * @param {number} [options.depth=-1] - The depth to which subdirectories should be read (-1 means unlimited)
	 * @param {boolean} [options.skipStat=false] - Whether to skip collecting file statistics
	 * @param {boolean} [options.includeDirs=false] - Whether to skip or include directories.
	 * @param {boolean} [options.skipSymbolicLink=false] - Whether to skip symbolic links
	 * @param {boolean} [options.skipIndex=false] - Whether to skip saved indexed
	 * @param {Function} [options.filter] - A filter function to apply to directory entries
	 * @yields {DocumentEntry}
	 * @returns {AsyncGenerator<DocumentEntry, void, unknown>}
	 */
	async *readDir(uri, options = {}) {
		const {
			skipStat = false,
			skipSymbolicLink = false,
			skipIndex = false,
			includeDirs = false,
			filter,
			depth = -1,
			context,
		} = options

		this.console.debug("readDir()", uri, { uri, options })

		const authContext = AuthContext.from(context || this.context)
		await this.ensureAccess(uri, "r", authContext)

		if (!skipIndex) {
			const indexPath = this.resolveSync(this.Index.FULL_INDEX)
			if (depth < 0) {
				const entries = await this.loadDocument(indexPath)
				if (entries) {
					const index = DirectoryIndex.decode(entries)
					for (const [path, stat] of index.entries) {
						const entry = new DocumentEntry({ path, stat })
						if (!filter || filter(entry)) {
							yield entry
						}
					}
					return
				}
			}
			const indexTxtPath = this.resolveSync(uri, this.Index.INDEX)
			const entries = await this.loadDocument(indexTxtPath, undefined, authContext)
			if (entries) {
				const index = DirectoryIndex.decode(entries)
				for (const [name, stat] of index.entries) {
					const path = this.resolveSync(uri, name)
					const entry = new DocumentEntry({ path, name: name, stat: stat })
					if (!filter || filter(entry)) {
						yield entry
					}
				}
				if (Math.abs(depth) > 0) {
					for (const [name, item] of index.entries) {
						if (item.isDirectory) {
							const subdir = this.resolveSync(uri, name)
							yield* this.readDir(subdir, { ...options, depth: depth - 1, context: authContext })
						}
					}
				}
				return
			}
		}

		try {
			const list = await this.listDir(uri, authContext)
			const files = []
			const dirs = []

			for (const entry of list) {
				// Apply filter if provided
				if (filter && !filter(entry)) {
					continue
				}

				if (entry.isDirectory) {
					dirs.push(entry)
				} else {
					files.push(entry)
				}
			}

			// Yield directories first if depth > 0
			for (const dir of dirs) {
				if (includeDirs) {
					yield dir
				}
				if (Math.abs(depth) > 0) {
					const subdir = this.resolveSync(uri, dir.name)
					yield* this.readDir(subdir, { ...options, depth: depth - 1, context: authContext })
				}
			}

			// Yield files
			for (const file of files) {
				yield file
			}
		} catch (/** @type {any} */err) {
			this.console.warn(`Failed to list directory: ${uri}`, err)
		}
	}

	/**
	 * Reads a specific branch at given depth
	 * @param {string} uri - URI for the branch
	 * @param {number} [depth=-1] - Depth of read
	 * @returns {Promise<AsyncGenerator<DocumentEntry, void, unknown>>}
	 */
	async readBranch(uri, depth = -1) {
		this.console.debug("readBranch()", uri, { uri, depth })
		return this.readDir(uri, { depth })
	}

	/**
	 * Ensures DB is connected. Throws if connection fails.
	 * @returns {Promise<void>}
	 * @throws {Error} If connection cannot be established
	 */
	async requireConnected() {
		this.console.debug("requireConnected()")
		if (!this.connected) {
			await this.connect()
		}
		if (!this.connected) {
			this.console.error("Database connection failed")
			throw new Error("DB is not connected")
		}
		this.console.info("Database connected successfully")
	}

	/**
	 * Searches for URI matching condition
	 * @param {string | ((path: string) => boolean)} uri - Search pattern or callback
	 * @param {number} [depth=0] - Maximum depth to search
	 * @yields {string} Full URI path of found documents
	 * @returns {AsyncGenerator<string, void, unknown>}
	 */
	async *find(uri, depth = 0) {
		this.console.debug("find()", uri, { depth })
		await this.requireConnected()
		const entries = []
		if (this.loaded) {
			for (const [path] of this.meta) {
				entries.push(path)
			}
		} else {
			this.console.debug("find().readDir()", uri)
			for await (const entry of this.readDir(this.root, { depth: depth + 1 })) {
				entries.push(entry.path)
			}
			this.console.debug("find().readDir().done", uri, { root: this.root, entries })
			this.meta.set("?loaded", new DocumentStat())
		}
		if ("function" === typeof uri) {
			for (const path of entries) {
				if (uri(path)) {
					yield path
				}
			}
		} else {
			if (entries.includes(uri)) {
				yield uri
			}
		}
	}

	/**
	 * Connects to the database. This method should be overridden by subclasses.
	 * Initializes in-memory data from predefined and builds directory metadata.
	 * @abstract
	 * @returns {Promise<void>}
	 */
	async connect() {
		this.console.info("Connecting to database")
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
		for (const key of this.meta.keys()) {
			let dir
			if (key.endsWith("/")) {
				dir = ((this.dirname(key) || ".") + "/").replace(/\/+/g, "/")
			} else {
				const arr = key.split("/")
				arr.pop()
				dir = arr.join("/")
				if (!dir) dir = "."
				dir += "/"
			}
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
				if (this.isRoot(dir)) dir = "."
				this.meta.set(dir, new DocumentStat({ size, mtimeMs, isDirectory: true }))
			}
		}
		this.connected = true
		this.console.info("Database connected")
	}

	/**
	 * Gets document content from cache or loads if missing.
	 * Supports default fallback value for missing documents.
	 * @param {string} uri - Document URI
	 * @param {object | GetOptions} [input] - Options or GetOptions instance
	 * @param {AuthContext | object} [context=this.context] - Auth context
	 * @returns {Promise<any>} Document content
	 */
	async get(uri, input = {}, context) {
		let opts
		if (context !== undefined) {
			opts = this.GetOptions.from(input)
		} else {
			opts = this.GetOptions.from(input || {})
			context = this.context
		}
		const authContext = AuthContext.from(context)
		uri = this.normalize(uri)
		this.console.debug("get()", uri, { opts })
		await this.ensureAccess(uri, "r", authContext)
		if (!this.data.has(uri) || false === this.data.get(uri)) {
			const data = await this.loadDocument(uri, opts.defaultValue, authContext)
			this.console.debug("get().done", uri, { data, cache: false })
			this.data.set(uri, data)
			return data
		}
		const data = this.data.get(uri)
		this.console.debug("get().done", uri, { data, cache: true })
		return data
	}

	/**
	 * Sets document content in cache and updates metadata timestamp.
	 * @param {string} uri - Document URI
	 * @param {any} data - Document data
	 * @param {AuthContext | object} [context=this.context] - Auth context
	 * @returns {Promise<any>} The set data
	 */
	async set(uri, data, context = this.context) {
		const authContext = AuthContext.from(context)
		this.console.debug("set()", uri, { data })
		await this.ensureAccess(uri, "w", authContext)
		this.data.set(uri, data)
		const meta = this.meta.has(uri) ? this.meta.get(uri) : {}
		this.meta.set(uri, new DocumentStat({ ...meta, mtimeMs: Date.now() }))
		return data
	}

	/**
	 * Gets document statistics from cache or loads if missing.
	 * Supports extension fallback for extension-less URIs.
	 * @param {string} uri - Document URI
	 * @param {AuthContext | object} [context=this.context] - Auth context
	 * @returns {Promise<DocumentStat | undefined>}
	 */
	async stat(uri, context = this.context) {
		const authContext = AuthContext.from(context)
		this.console.debug("stat()", uri)
		await this.ensureAccess(uri, "r", authContext)
		if (!this.meta.has(uri)) {
			const stat = await this.statDocument(uri, authContext)
			this.console.debug("stat().done", uri, { stat, cache: false })
			this.meta.set(uri, stat)
		}
		const stat = this.meta.get(uri)
		this.console.debug("stat().done", uri, { stat, cache: true })
		return stat
	}

	/**
	 * Resolves path segments to absolute path
	 * @note Must be overwritten by platform-specific implementation
	 * @param  {...string} args - Path segments
	 * @returns {Promise<string>} Resolved absolute path
	 */
	async resolve(...args) {
		this.console.debug("resolve()", { args })
		return Promise.resolve(this.resolveSync(...args))
	}

	/**
	 * Normalize path segments to absolute path
	 * Handles .., ., and duplicate slashes.
	 * @param  {...string} args - Path segments
	 * @returns {string} Normalized path
	 */
	normalize(...args) {
		return normalize(...args)
	}
	/**
	 * Checks if current uri has scheme in it, such as http://, https://, ftp://, file://, etc.
	 * @param {string} uri
	 * @returns {boolean}
	 */
	isRemote(uri) {
		return isRemote(uri)
	}
	/**
	 * Checks if current uri is absolute (started from /) or remote.
	 * @param {string} uri
	 * @returns {boolean}
	 */
	isAbsolute(uri) {
		return isAbsolute(uri)
	}
	/**
	 * Resolves path segments to absolute path synchronously
	 * Combines cwd, root, and args with normalization.
	 * @param  {...string} args - Path segments
	 * @returns {string} Resolved absolute path
	 */
	resolveSync(...args) {
		return resolveSync(this.cwd, this.root, ...args)
	}

	/**
	 * Returns base name of URI with the removedSuffix (if provided).
	 * If removeSuffix is true the extension will be removed.
	 * @param {string} uri
	 * @param {string | true} [removeSuffix] - Suffix to remove or true for extension
	 * @returns {string}
	 */
	basename(uri, removeSuffix = "") {
		return basename(uri, removeSuffix)
	}

	/**
	 * Returns directory name of URI
	 * @param {string} uri
	 * @returns {string}
	 */
	dirname(uri) {
		return dirname(uri)
	}
	/**
	 * Gets absolute path
	 * @note Must be overwritten by platform-specific implementation
	 * @param  {...string} args - Path segments
	 * @returns {string} Absolute path
	 */
	absolute(...args) {
		this.console.debug("absolute()", { cwd: this.cwd, root: this.root, args })
		return absolute(this.cwd, this.root, ...args)
	}
	/**
	 * Loads a document.
	 * Must be overwritten to have the proper file or database document read operation.
	 * In a basic class it just loads already saved data in the db.data map.
	 * Supports extension fallback for extension-less URIs.
	 * @param {string} uri - Document URI
	 * @param {any} [defaultValue] - Default value if document not found
	 * @param {AuthContext | object} [context=this.context] - Auth context
	 * @returns {Promise<any>}
	 */
	async loadDocument(uri, defaultValue, context = this.context) {
		this.console.debug("loadDocument()", uri, { defaultValue })
		return await this.loadDocumentAs(this.extname(uri), uri, defaultValue, context)
	}

	/**
	 * Loads a document using a specific extension handler.
	 * @param {string} ext The extension of the document.
	 * @param {string} uri The URI to load the document from.
	 * @param {any} defaultValue The default value to return if the document does not exist.
	 * @param {AuthContext | object} [context=this.context] - Auth context
	 * @returns {Promise<any>} The loaded document or the default value.
	 */
	async loadDocumentAs(ext, uri, defaultValue, context = this.context) {
		this.console.debug("loadDocumentAs()", uri, { ext, defaultValue })
		const authContext = AuthContext.from(context)
		uri = this.normalize(uri)
		await this.ensureAccess(uri, "r", authContext)
		const stats = await this.statDocument(uri)
		if (stats.exists) {
			if (this.driver) {
				const abs = this.absolute(uri)
				const result = await this.driver.read(abs)
				if (undefined !== result) {
					return result
				}
				return this.data.get(uri)
			}
		} else {
			if (!ext) {
				for (const ext of this.Directory.DATA_EXTNAMES) {
					const stats = await this.statDocument(uri + ext)
					if (stats.exists && stats.isFile) {
						const data = await this.loadDocument(uri + ext, null, authContext)
						if (null !== data) {
							return data
						}
					}
				}
			}
		}
		return defaultValue
	}

	/**
	 * Saves a document.
	 * Must be overwritten to have the proper file or database document save operation.
	 * In a basic class it just sets a document in the db.data map and db.meta map.
	 * Updates indexes after save.
	 * @param {string} uri - Document URI
	 * @param {any} document - Document data
	 * @param {AuthContext | object} [context=this.context] - Auth context
	 * @returns {Promise<boolean>}
	 */
	async saveDocument(uri, document, context = this.context) {
		this.console.debug("saveDocument()", uri, { document })
		const authContext = AuthContext.from(context)
		await this.ensureAccess(uri, "w", authContext)
		const abs = this.normalize(await this.resolve(uri))
		if (this.driver) {
			const abs = this.absolute(uri)
			try {
				const result = await this.driver.write(abs, document)
				if (false === result) {
					throw new Error("Unable to save with a driver: " + this.driver.constructor.name)
				}
			} catch (error) {
				this.console.error("Cannot save a document", { uri, abs, document, context, error })
				return false
			}
		}

		this.data.set(abs, document)
		const stat = this._statFromMeta(abs)
		stat.isFile = true
		stat.mtimeMs = Date.now()
		stat.size = Buffer.byteLength(JSON.stringify(document))
		this.meta.set(abs, stat)
		await this._updateIndex(abs)
		return true
	}

	/**
	 * Reads statistics for a specific document.
	 * Must be overwritten to have the proper file or database document stat operation.
	 * In a basic class it just returns a document stat from the db.meta map if exists.
	 * @note Must be overwritten by platform-specific implementation
	 * @param {string} uri - Document URI
	 * @param {AuthContext | object} [context=this.context] - Auth context
	 * @returns {Promise<DocumentStat>}
	 */
	async statDocument(uri, context = this.context) {
		this.console.debug("statDocument()", uri)
		const authContext = AuthContext.from(context)
		if ("." === uri) uri = "./"
		await this.ensureAccess(uri, "r", authContext)
		const isDir = uri.endsWith("/")
		const abs = (this.normalize(await this.resolve(uri)) || ".") + (isDir ? "/" : "")

		if (this.driver) {
			const abs = this.absolute(uri)
			try {
				const stats = await this.driver.stat(abs)
				if (stats) {
					return stats
				}
			} catch {
				this.console.error("Cannot stat a document", { uri, abs })
			}
		}

		return this._statFromMeta(abs)
	}

	/**
	 * Writes data to a document with overwrite
	 * @param {string} uri - Document URI
	 * @param {string} chunk - Data to write
	 * @param {AuthContext | object} [context=this.context] - Auth context
	 * @returns {Promise<boolean>} Success status
	 */
	async writeDocument(uri, chunk, context = this.context) {
		this.console.debug("writeDocument()", uri, { chunk })
		const authContext = AuthContext.from(context)
		await this.ensureAccess(uri, "w", authContext)
		if (this.driver) {
			const abs = this.absolute(uri)
			try {
				const result = await this.driver.append(abs, chunk)
				if (false === result) {
					throw new Error("Unable to write document")
				}
			} catch (error) {
				this.console.error("Cannot append document", { uri, abs, error })
				return false
			}
		}
		const str = String(this.data.get(uri) || "")
		this.data.set(uri, str + chunk)
		this.meta.set(uri, new DocumentStat({
			isFile: true, size: str.length + chunk.length, mtimeMs: Date.now()
		}))
		return true
	}

	/**
	 * Delete document from storage
	 * @note Must be overwritten by platform specific application
	 * @param {string} uri - Document URI
	 * @param {AuthContext | object} [context=this.context] - Auth context
	 * @returns {Promise<boolean>}
	 */
	async dropDocument(uri, context = this.context) {
		this.console.debug("dropDocument()", uri)
		const authContext = AuthContext.from(context)
		try {
			await this.ensureAccess(uri, "d", authContext)
		} catch (error) {
			this.console.error("No access to delete the document", { uri, context, error })
			return false
		}
		if (this.driver) {
			const abs = this.absolute(uri)
			try {
				const result = await this.driver.delete(abs)
				if (false === result) {
					throw new Error("Could not delete document")
				}
			} catch (error) {
				this.console.error("Cannot delete document", { uri, abs, context, error })
				return false
			}
		}
		this.data.delete(uri)
		this.meta.delete(uri)
		this.console.debug("Document deleted", { uri })
		return true
	}

	/**
	 * Ensures access to document with context.
	 * Delegates to driver for authorization checks.
	 * @param {string} uri - Document URI
	 * @param {'r'|'w'|'d'} [level="r"] - Access level
	 * @param {AuthContext | object} [context=this.context] - Auth context: { username, role, roles, user }
	 * @returns {Promise<void>}
	 * @throws {Error} - Access denied
	 */
	async ensureAccess(uri, level = "r", context = this.context) {
		this.console.debug("ensureAccess()", uri, { level, context })

		const authContext = AuthContext.from(context)

		if (!['r', 'w', 'd'].includes(level)) {
			this.console.debug("Incorrect level", { uri, level, context })
			throw new TypeError([
				"Access level must be one of [r, w, d]",
				"r = read",
				"w = write",
				"d = delete",
			].join("\n"))
		}

		if (this.driver) {
			const result = await this.driver.access(uri, level, authContext)
			if (false === result) {
				this.console.debug("Access denied", { uri, level, context })
				throw new Error(`Access denied to ${uri} { level: ${level} }`)
			}
		}
	}
	/**
	 * Synchronize data with persistent storage
	 * Saves changed documents where local mtime > remote stat mtime.
	 * @param {string|undefined} [uri] Optional specific URI to save
	 * @param {AuthContext | object} [context=this.context] - Auth context
	 * @returns {Promise<string[]>} Array of saved URIs
	 */
	async push(uri = undefined, context = this.context) {
		this.console.debug("push()", uri)
		const authContext = AuthContext.from(context)
		if (uri) {
			await this.ensureAccess(uri, "w", authContext)
		} else {
			for (const [key] of this.data) {
				await this.ensureAccess(key, "w", authContext)
			}
		}
		const changed = []
		for (const [key, value] of this.data) {
			const meta = this.meta.get(key) ?? { mtimeMs: 0 }
			const stat = await this.statDocument(key, authContext)
			if (meta.mtimeMs > stat.mtimeMs) {
				changed.push(key)
				await this.saveDocument(key, value, authContext)
			}
		}
		this.console.info("Data pushed to storage", { changedUris: changed })
		return changed
	}

	/**
	 * Moves a document from one URI to another URI
	 * Loads source, saves to target, drops source, updates indexes.
	 * @param {string} from - Source URI
	 * @param {string} to - Target URI
	 * @param {AuthContext | object} [context=this.context] - Auth context
	 * @returns {Promise<boolean>} Success status
	 */
	async moveDocument(from, to, context = this.context) {
		this.console.debug("moveDocument()", { from, to })
		const authContext = AuthContext.from(context)
		await this.ensureAccess(to, "w", authContext)
		await this.ensureAccess(from, "r", authContext)
		if (this.driver) {
			const absoluteFrom = this.absolute(from)
			const result = await this.driver.move(absoluteFrom, this.absolute(to))
			if (true === result) {
				await this._updateIndex(absoluteFrom)
			}
			if (false === result) {
				return false
			}
		}

		const data = await this.loadDocument(from, undefined, authContext)
		await this.saveDocument(to, data, authContext)
		await this.dropDocument(from, authContext)
		const abs = this.normalize(await this.resolve(from))
		await this._updateIndex(abs)
		return true
	}

	/**
	 * Disconnect from database
	 * Clears connection state. Subclasses should override for cleanup.
	 * @returns {Promise<void>}
	 */
	async disconnect() {
		this.console.info("Disconnecting from database")
		this.connected = false
		this.console.info("Database disconnected")
	}

	/**
	 * Lists immediate entries in a directory by scanning meta keys.
	 * Filters to direct children only.
	 * @param {string} uri - The directory URI (e.g., "content", ".", "dir/")
	 * @param {AuthContext | object} [context=this.context] - Auth context
	 * @returns {Promise<DocumentEntry[]>}
	 * @throws {Error} If directory does not exist
	 */
	async listDir(uri, context = this.context) {
		this.console.debug("listDir()", uri)
		const authContext = AuthContext.from(context)
		await this.ensureAccess(uri, "r", authContext)
		if (this.driver) {
			const abs = this.absolute(uri)
			try {
				const entries = await this.driver.listDir(abs)
			} catch (error) {
				this.console.error("Cannot list directory", { uri, abs, error })
			}
		}
		const prefix = uri === '.' ? '' : uri.endsWith("/") ? uri : uri + '/'
		const depth = (uri.endsWith("/") ? uri.slice(0, -1) : uri).split("/").length
		const keys = Array.from(this.meta.keys())
		const filtered = keys.filter(key => {
			if (!key.startsWith(prefix) || key === prefix || this.isRoot(key)) return false
			const d = (key.endsWith("/") ? key.slice(0, -1) : key).split("/").length
			return d === depth + (this.isRoot(uri) ? 0 : 1)
		})
		return filtered.map(path => {
			const isDir = path.endsWith("/")
			if (isDir) {
				const stat = new DocumentStat({ isDirectory: true, mtimeMs: Date.now() })
				return new DocumentEntry({ path: path.slice(0, -1), stat })
			}
			const stat = this.meta.get(path) || new DocumentStat({ isFile: true, mtimeMs: Date.now() })
			return new DocumentEntry({ path, stat })
		})
	}

	/**
	 * Push stream of progress state
	 * Traverses directory with sorting, limiting, and loading options.
	 * Yields StreamEntry with cumulative stats and errors.
	 * @param {string} uri - Starting URI
	 * @param {object} [options] - Stream options
	 * @param {AuthContext | object} [options.context] - Auth context
	 * @param {Function} [options.filter] - Filter function
	 * @param {number} [options.limit] - Limit number of entries
	 * @param {'name'|'mtime'|'size'} [options.sort] - The sort criteria
	 * @param {'asc'|'desc'} [options.order] - Sort order
	 * @param {boolean} [options.skipStat] - Skip statistics
	 * @param {boolean} [options.skipSymbolicLink] - Skip symbolic links
	 * @param {boolean} [options.load=false] - Load data files into memory
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
			load = false,
			context,
		} = options
		this.console.debug("findStream()", uri, { options })
		const authContext = AuthContext.from(context || this.context)
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

		const totalSize = { dirs: 0, files: 0 }

		await this.ensureAccess(uri, "r", authContext)

		const files = []
		for await (const file of this.readDir(uri, { skipStat, skipSymbolicLink, filter, context: authContext })) {
			files.push(file)
			if (file.stat.error) {
				errors.set(file.path, file.stat.error)
			}
			if (file.stat.isDirectory) {
				dirs.set(file.path, file)
				totalSize.dirs += file.stat.size
			}
			totalSize.files += file.stat.isFile ? file.stat.size : 0

			// Populate top entries (only immediate children of the root URI)
			const relativePath = file.path.startsWith(uri) ? file.path.substring(uri.length) : file.path
			const parts = relativePath.split('/').filter(Boolean)
			if (parts.length === 1 || (relativePath.endsWith('/') && 2 === parts.length)) {
				top.set(file.name, file)
			}

			const entry = new StreamEntry({
				file,
				files: files.sort(sortFn),
				dirs,
				top,
				errors,
				progress: 0,
				totalSize,
			})
			yield entry
			if (!skipStat) this.meta.set(file.path, file.stat)
			if (load && this.isData(file.path)) {
				const data = await this.loadDocument(file.path, undefined, authContext)
				this.data.set(file.path, data)
			}
			if (limit > 0 && files.length >= limit) break
		}
	}

	/**
	 * Returns TRUE if uri is a data file.
	 * Checks against supported DATA_EXTNAMES.
	 * @param {string} uri
	 * @returns {boolean}
	 */
	isData(uri) {
		const ext = this.extname(uri)
		return ext && this.Directory.DATA_EXTNAMES.includes(ext) || !ext
	}

	/**
	 * Gets inheritance data for a given path
	 * Loads and merges directory-level settings (e.g., _.json files) up the hierarchy.
	 * Caches results to avoid redundant loads.
	 * @param {string} path - Document path
	 * @returns {Promise<any>} Inheritance data
	 */
	async getInheritance(path) {
		this.console.debug("getInheritance()", path)
		const inheritanceChain = this.Data.getPathParents(path, "/")

		// Load root inheritance data
		if (!this._inheritanceCache.has('/')) {
			try {
				const rootData = await this.loadDocument(this.Directory.FILE)
				this._inheritanceCache.set('/', rootData)
				this.console.debug("getInheritance().loaded", path, { rootData })
			} catch (/** @type {any} */ err) {
				this.console.warn("Failed to load root inheritance data", { error: err.message })
				this._inheritanceCache.set('/', {})
			}
		}
		let mergedData = this._inheritanceCache.get('/') || {}

		for (const dirPath of inheritanceChain) {
			if (!this._inheritanceCache.has(dirPath)) {
				try {
					const uri = this.resolveSync(dirPath, this.Directory.FILE)
					const dirData = await this.loadDocument(uri)
					this._inheritanceCache.set(dirPath, dirData)
					this.console.debug("getInheritance().loaded", path, { dirPath, dirData })
				} catch (/** @type {any} */ err) {
					this.console.warn("Failed to load directory inheritance data", { dirPath, error: err.message })
					this._inheritanceCache.set(dirPath, {})
				}
			}
			const dirData = this._inheritanceCache.get(dirPath) || {}
			mergedData = this.Data.merge(mergedData, dirData)
		}

		this.console.debug("getInheritance().done", path, { mergedData })
		return mergedData
	}

	/**
	 * Gets global variables for a given path, global variables are stored in _/ subdirectory
	 * Traverses up hierarchy, loading files from _/ directories.
	 * @param {string} path - Document path
	 * @returns {Promise<any>} Global variables data
	 */
	async getGlobals(path) {
		this.console.debug("getGlobals()", path)
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
							globals[this.basename(entry.name, true)] = value
						}
					}
				}
			}
		} catch (/** @type {any} */ err) {
			this.console.warn("Error reading global variables directory", { path, error: err.message })
			// If no _/ directory or error reading it, continue with empty object
		}

		this.console.debug("getGlobals().done", path, { globals })
		return globals
	}

	/**
	 * Fetch document with inheritance, globals and references processing
	 * Handles extension lookup, directory resolution, and merging.
	 * @param {string} uri
	 * @param {object | FetchOptions} [input]
	 * @param {AuthContext | object} [context=this.context] - Auth context
	 * @returns {Promise<any>}
	 */
	async fetch(uri, input = {}, context = this.context) {
		let opts
		if (context !== undefined) {
			opts = FetchOptions.from(input)
		} else {
			opts = FetchOptions.from(input || {})
			context = this.context
		}
		// make reference‑resolution on by default (tests rely on it)
		if (opts.refs === undefined) opts.refs = true
		if (opts.inherit === undefined) opts.inherit = true
		if (opts.globals === undefined) opts.globals = true

		const authContext = AuthContext.from(context)
		this.console.debug("fetch()", uri, { uri, opts })
		// Handle extension-less URIs by trying common extensions
		let ext = this.extname(uri)
		let mightBeDirectory = false

		if (!ext) {
			mightBeDirectory = true
			// Check if this is a directory
			if (opts.allowDirs && uri.endsWith("/")) {
				try {
					const arr = this.Directory.DATA_EXTNAMES.slice()
					let extname
					do {
						extname = arr.shift()
						const path = this.resolveSync(uri, this.Directory.INDEX + extname)
						const stat = await this.statDocument(path, authContext)
						if (stat.exists) {
							return await this.fetchMerged(path, opts, authContext)
						}
					} while (extname)
				} catch (/** @type {any} */ err) {
					this.console.warn("Error checking if URI is directory", { uri, error: err.message })
					// Not a directory, continue with file extensions
				}
			}

			// Try to find a file with one of the supported extensions
			const extsToTry = this.Directory.DATA_EXTNAMES
			for (const extension of extsToTry) {
				const fullUri = uri + extension
				const stat = await this.statDocument(fullUri, authContext)
				if (stat.exists) {
					return await this.fetchMerged(fullUri, opts, authContext)
				}
			}

			// If no file found, return default value
			this.console.debug("fetch().fail", uri, { uri, opts })
			return opts.defaultValue
		}

		// If extension is not supported, try to load as is
		if (!this.Directory.DATA_EXTNAMES.includes(ext)) {
			try {
				return await this.loadDocumentAs(".txt", uri, opts.defaultValue, authContext)
			} catch (/** @type {any} */ err) {
				// If loading fails, return default value
				this.console.warn("Error loading document with unsupported extension", { uri, error: err.message })
				return opts.defaultValue
			}
		}

		// Try to load as file with extension
		try {
			const result = await this.fetchMerged(uri, opts, authContext)
			return result
		} catch (/** @type {any} */ err) {
			// If it's a potential directory and directories are allowed, try as directory
			if (mightBeDirectory && opts.allowDirs) {
				try {
					const indexPath = await this.resolve(uri, this.Index.INDEX)
					if (indexPath === uri) {
						throw new Error("Impossible to have the same directory path as a request uri")
					}
					const result = await this.fetchMerged(indexPath, opts, authContext)
					return result
				} catch (/** @type {any} */ indexErr) {
					// If index file doesn't exist, return listing
					if (opts.allowDirs) {
						const dirEntries = await this.listDir(uri, authContext)
						if (dirEntries.length > 0) {
							return dirEntries.map(entry => ({
								name: entry.name,
								path: entry.path,
								isDirectory: entry.isDirectory,
								isFile: entry.isFile,
								size: entry.stat.size,
								mtime: entry.stat.mtime.toISOString()
							}))
						}
					}
					// Otherwise return default value
					this.console.warn("Index file not found for directory", { uri, error: indexErr.message })
					return opts.defaultValue
				}
			}
			// Otherwise return default value
			this.console.warn("Error fetching document", { uri, error: err.message })
			return opts.defaultValue
		}
	}

	/**
	 * Merges data from multiple sources following nano-db-fetch patterns.
	 * Handles inheritance, globals, and references with circular protection.
	 * @param {string} uri - The URI to fetch and merge data for
	 * @param {FetchOptions} [opts] - Fetch options
	 * @param {AuthContext | Set<string>} [contextOrVisited] - Auth context or visited set
	 * @param {Set<string>} [visited=new Set()] - For internal circular reference protection
	 * @returns {Promise<any>} Merged data object
	 */
	async fetchMerged(uri, opts = new FetchOptions(), contextOrVisited = this.context, visited = new Set()) {
		const authContext = AuthContext.from(contextOrVisited)
		let visitedSet = visited
		if (contextOrVisited instanceof Set) {
			visitedSet = contextOrVisited
		}
		this.console.debug("fetchMerged()", uri, { uri, opts, visited: Array.from(visitedSet) })
		opts = FetchOptions.from(opts)
		const extname = this.extname(uri)
		const isData = !extname || this.Directory.DATA_EXTNAMES.includes(extname)

		// Prevent self-repeating
		if (visitedSet.has(uri)) {
			this.console.warn("Circular inheritance chain detected", { uri })
			return opts.defaultValue
		}
		const nextVisited = new Set(visitedSet).add(uri)

		// Load the document first
		let data = await this.loadDocument(uri, undefined, authContext)
		const isExtensible = "object" === typeof data && null !== data && !Array.isArray(data)

		if (opts.inherit && isExtensible) {
			// Always load root inheritance first
			if (!this._inheritanceCache.has('/')) {
				const rootUri = this.resolveSync('/', Directory.FILE)
				const rootInheritance = await this.loadDocument(rootUri, {}, authContext)
				this._inheritanceCache.set('/', rootInheritance)
			}
			let dir = uri
			let parentData = clone(this._inheritanceCache.get('/')) || {}
			const dirs = []
			try {
				do {
					dir = this.dirname(dir)
					let currentDir = this.resolveSync(dir, this.Directory.FILE)
					if (currentDir.startsWith("/")) currentDir = currentDir.slice(1)
					const stat = await this.statDocument(currentDir, authContext)
					if (stat && stat.exists) {
						const data = await this.loadDocument(currentDir, {}, authContext)
						parentData = this.Data.merge(parentData, data)
						dirs.push({ dir: currentDir, data: data })
					}
				} while (!this.isRoot(dir))
				data = this.Data.merge(parentData, data)
			} catch (/** @type {any} */ err) {
				this.console.warn("Error processing inheritance", { dir, dirs, parentData, error: err.message })
			}
		}

		if (opts.globals && isData && isExtensible) {
			const globals = await this.getGlobals(uri)
			data = this.Data.merge(globals, data)
		}

		if (opts.refs && isData && isExtensible) {
			data = await this.resolveReferences(data, uri, opts, nextVisited)
		}

		return data || opts.defaultValue
	}

	_findReferenceKeys(flat) {
		if (!Array.isArray(flat)) flat = Object.entries(this.Data.flatten(flat))
		const inValue = this.Data.REFERENCE_KEY + ":"
		const inKey = this.Data.REFERENCE_KEY
		const path = this.Data.OBJECT_DIVIDER + inKey
		const isInKey = key => key.endsWith(path) || inKey === key
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
	 * Handles document references and resolves them recursively with circular reference protection.
	 * Supports fragment references (e.g., #prop/subprop) and merges siblings.
	 * @param {object} data - Document data with potential references
	 * @param {string} [basePath] - Base path for resolving relative references
	 * @param {object|FetchOptions} [opts] - Options that will be passed to fetch
	 * @param {Set<string>} [visited] - Set of visited URIs to prevent circular references
	 * @returns {Promise<object>} Data with resolved references
	 */
	async resolveReferences(data, basePath = '', opts = new FetchOptions(), visited = new Set()) {
		this.console.debug("resolveReferences()", { data, basePath, visited: Array.from(visited) })

		if (typeof data !== 'object' || data === null || Array.isArray(data)) {
			return data
		}

		const flat = this.Data.flatten(data)
		const refKeys = this._findReferenceKeys(flat)
		const newFlat = { ...flat }
		const circulars = new Set()

		for (const [key, refPath] of refKeys) {
			try {
				let refString = refPath
				if (typeof refPath === 'object' && refPath !== null && this.Data.REFERENCE_KEY in refPath) {
					refString = refPath[this.Data.REFERENCE_KEY]
				}

				if (typeof refString !== 'string') {
					continue
				}

				const dir = this.dirname(basePath)
				const absPath = refString.startsWith('/')
					? this.normalize(refString)
					: this.resolveSync(dir, refString)

				// Avoid reading the same file we're currently processing
				// This prevents infinite loops when a file references itself
				if (absPath === basePath) {
					this.console.warn("Self-reference skipped", { ref: absPath })
					continue
				}

				if (visited.has(absPath)) {
					this.console.warn("Circular reference skipped", { ref: absPath })
					circulars.add(key)
					continue
				}

				let refValue

				if (absPath.includes('#')) {
					const [filePath, fragment] = absPath.split('#')
					const targetData = await this.loadDocument(filePath)
					refValue = this.Data.find(fragment.split('/').filter(Boolean), targetData) ?? undefined
				} else {
					refValue = await this.fetchMerged(absPath, opts, visited)
				}

				if (refValue === undefined) {
					continue
				}

				const parentKey = this._getParentReferenceKey(key)
				const siblings = this.Data.flatSiblings(Object.entries(newFlat), key, parentKey).map(
					([k, val]) => parentKey
						? [k.slice((parentKey + this.Data.OBJECT_DIVIDER).length), val]
						: [k, val]
				)

				if (parentKey === '' && key === this.Data.REFERENCE_KEY) {
					delete newFlat[key]
					for (const [k, v] of Object.entries(refValue)) {
						newFlat[k] = v
					}
				} else if (siblings.length > 0) {
					newFlat[parentKey] = this.Data.merge(
						typeof refValue === 'object' ? refValue : { value: refValue },
						Object.fromEntries(siblings)
					)
					// Cleanup sibling keys
					for (const [k] of siblings) {
						delete newFlat[parentKey + this.Data.OBJECT_DIVIDER + k]
					}
				} else {
					newFlat[parentKey || key] = refValue
				}

				// Cleanup child keys
				const prefix = (parentKey || key) + this.Data.OBJECT_DIVIDER
				Object.keys(newFlat).forEach(k => {
					if (k.startsWith(prefix) && k !== (parentKey || key)) {
						delete newFlat[k]
					}
				})

			} catch (/** @type {any} */ err) {
				this.console.warn("Error resolving reference", { key, error: err.message })
			}
		}
		if (flat[this.Data.REFERENCE_KEY] && "object" === typeof newFlat[this.Data.REFERENCE_KEY] && newFlat[this.Data.REFERENCE_KEY]) {
			const base = clone(newFlat[this.Data.REFERENCE_KEY])
			delete flat[this.Data.REFERENCE_KEY]
			const obj = this.Data.unflatten(flat)
			return merge(obj, base)
		}

		return this.Data.unflatten(newFlat)
	}

	/**
	 * Auto-updates index.jsonl and index.txt after document save for all parent directories
	 * @param {string} uri - URI of saved document
	 * @returns {Promise<void>}
	 */
	async _updateIndex(uri) {
		this.console.debug("_updateIndex()", uri)
		const base = this.basename(uri)
		if ([this.Index.FULL_INDEX, this.Index.INDEX].includes(base)) {
			return
		}
		const indexUris = DirectoryIndex.getIndexesToUpdate(this, uri)
		for (const indexPath of indexUris) {
			const dirPath = this.dirname(indexPath)
			const entries = await DirectoryIndex.getDirectoryEntries(this, dirPath)
			await this.saveIndex(dirPath, entries)
		}
		this.console.debug("_updateIndex().done", uri, {
			indexesUpdated: indexUris.length,
			paths: indexUris
		})
	}

	/**
	 * Saves index data to both index.jsonl and index.txt files
	 * @param {string} dirUri Directory URI where indexes should be saved
	 * @param {Array<[string, DocumentStat]>} [entries] Document entries with their paths, if not provided this.meta is used.
	 * @returns {Promise<void>}
	 */
	async saveIndex(dirUri, entries) {
		this.console.debug("saveIndex()", dirUri, { entries })
		if (!entries) {
			const base = this.normalize(dirUri)
			entries = Array.from(this.meta.entries()).filter(
				([uri]) => uri.startsWith(base)
			)
		}
		const longIndex = this.resolveSync(dirUri, this.Index.FULL_INDEX)
		const dirIndex = this.resolveSync(dirUri, this.Index.INDEX)

		const index = this.Index.from({ entries })

		await this.saveDocument(longIndex, index.encode({ inc: true, long: true }))
		await this.saveDocument(dirIndex, index.encode())
	}

	/**
	 * Loads index data from either index.jsonl or index.txt file
	 * @param {string} [dirUri] Directory URI where index file is located
	 * @returns {Promise<DirectoryIndex>} Index data.
	 */
	async loadIndex(dirUri = ".") {
		const indexes = [
			this.resolveSync(this.Index.FULL_INDEX),
			this.resolveSync(dirUri, this.Index.INDEX),
		]
		for (const path of indexes) {
			try {
				const entries = await this.loadDocument(path)
				if (!entries) {
					throw new Error(["Empty index", path].join(": "))
				}
				return this.Index.decode(entries)
			} catch (/** @type {any} */ err) {
				this.console.warn(err.message)
			}
		}
		// No index found
		return new DirectoryIndex()
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
