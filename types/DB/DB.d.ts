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
    static Data: typeof Data;
    static Directory: typeof Directory;
    static Driver: typeof DBDriverProtocol;
    static Index: typeof DirectoryIndex;
    static GetOptions: typeof GetOptions;
    static FetchOptions: typeof FetchOptions;
    static DATA_EXTNAMES: string[];
    /**
     * Creates a new DB instance from properties if object provided
     * @param {object|DB} input - Properties or DB instance
     * @returns {DB}
     */
    static from(input: object | DB): DB;
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
    constructor(input?: {
        cwd?: string | undefined;
        root?: string | undefined;
        driver?: DBDriverProtocol | undefined;
        connected?: boolean | undefined;
        data?: Map<string, any> | undefined;
        meta?: Map<string, DocumentStat> | undefined;
        ttl?: number | undefined;
        context?: AuthContext | object;
        predefined?: Map<string, any> | (readonly [string, any])[] | undefined;
        dbs?: DB[] | undefined;
        console?: Console | NoConsole | undefined;
    });
    /** @type {DBDriverProtocol} */
    driver: DBDriverProtocol;
    /** @type {string} */
    encoding: string;
    /** @type {Map<string, any | false>} */
    data: Map<string, any | false>;
    /** @type {Map<string, DocumentStat>} */
    meta: Map<string, DocumentStat>;
    /** @type {number} */
    ttl: number;
    /** @type {AuthContext} */
    context: AuthContext;
    /** @type {boolean} */
    connected: boolean;
    /** @type {string} */
    root: string;
    /** @type {string} */
    cwd: string;
    /** @type {DB[]} */
    dbs: DB[];
    /** @type {Map} */
    predefined: Map<any, any>;
    /** @type {Map<string, any>} */
    _inheritanceCache: Map<string, any>;
    /**
     * Returns whether the database directory has been loaded
     * @returns {boolean}
     * Returns state of ?loaded marker in meta Map
     * After .connect() and .readDir() the marker is placed as {mtime: true}
     * Because we can load only once when depth=0, and every subsequent .readBranch() is depth>0
     * and works with fully loaded DocumentEntry or DocumentStat data
     */
    get loaded(): boolean;
    /**
     * Returns constructor options to save and restore database instance later.
     * @returns {Record<string, any>}
     */
    get options(): Record<string, any>;
    /** @returns {Console | NoConsole} */
    get console(): Console | NoConsole;
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
    get Data(): typeof Data;
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
    get Directory(): typeof Directory;
    /**
     * Returns static.Driver that is assigned to DBDriverProtocol or its extension
     * @returns {typeof DBDriverProtocol}
     */
    get Driver(): typeof DBDriverProtocol;
    /**
     * @returns {typeof DirectoryIndex}
     */
    get Index(): typeof DirectoryIndex;
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
    get GetOptions(): typeof GetOptions;
    /**
     * @param {string} abs
     * @returns {DocumentStat}
     */
    _statFromMeta(abs: string): DocumentStat;
    isRoot(dir: any): boolean;
    /**
     * Attaches another DB instance to this database for federated access.
     * Allows routing operations across multiple databases.
     * @param {DB} db - Database to attach
     * @returns {void}
     * @throws {TypeError} If non-DB instance is provided
     */
    attach(db: DB): void;
    /**
     * Detaches a database instance from this database.
     * @param {DB} db - Database to detach
     * @returns {DB[]|boolean} Array of detached database or false if not found
     */
    detach(db: DB): DB[] | boolean;
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
    extract(uri: string): DB;
    /**
     * Extracts file extension with leading dot from URI
     * @param {string} uri
     * @returns {string} Extension (e.g., ".txt") or empty string
     * @example
     * db.extname("file.TXT") // => .txt
     */
    extname(uri: string): string;
    /**
     * Relative path resolver for file systems.
     * Must be implemented by platform specific code
     * @param {string} from Base directory path
     * @param {string} [to=this.root] Target directory path
     * @returns {string} Relative path
     */
    relative(from: string, to?: string | undefined): string;
    /**
     * Get string representation of the database
     * @returns {string} Formatted string like "DB /root [utf-8]"
     */
    toString(): string;
    /**
     * Dumps current database into destination database.
     * Copies all documents and builds indexes in the destination.
     * @param {DB} dest - Destination database
     * @param {object} [options]
     * @param {({ uri, url, data, current, total }) => void} [options.onProgress] - Progress callback
     * @returns {Promise<{ total: number, processed: number, ignored: number, updatedURIs: string[] }>}
     */
    dump(dest: DB, options?: {
        onProgress?: (({ uri, url, data, current, total }: {
            uri: any;
            url: any;
            data: any;
            current: any;
            total: any;
        }) => void) | undefined;
    } | undefined): Promise<{
        total: number;
        processed: number;
        ignored: number;
        updatedURIs: string[];
    }>;
    /**
     * Build indexes inside the directory.
     * Generates `index.txt` and `index.txtl` files for efficient traversal.
     * @param {string} dir - Directory URI (default: '.')
     * @returns {Promise<void>}
     */
    buildIndexes(dir?: string): Promise<void>;
    /**
     *
     * @param {string} dirPath The directory path.
     * @param {Array<[string, DocumentStat]>} [entries=[]] Entries to extend with the files found.
     * @param {number} [depth=0] The depth level.
     * @returns
     */
    _buildRecursiveDirectoryTree(dirPath: string, entries?: [string, DocumentStat][] | undefined, depth?: number | undefined): Promise<[string, DocumentStat][]>;
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
    readDir(uri: string, options?: {
        context?: AuthContext | object;
        depth?: number | undefined;
        skipStat?: boolean | undefined;
        includeDirs?: boolean | undefined;
        skipSymbolicLink?: boolean | undefined;
        skipIndex?: boolean | undefined;
        filter?: Function | undefined;
    } | undefined): AsyncGenerator<DocumentEntry, void, unknown>;
    /**
     * Reads a specific branch at given depth
     * @param {string} uri - URI for the branch
     * @param {number} [depth=-1] - Depth of read
     * @returns {Promise<AsyncGenerator<DocumentEntry, void, unknown>>}
     */
    readBranch(uri: string, depth?: number | undefined): Promise<AsyncGenerator<DocumentEntry, void, unknown>>;
    /**
     * Ensures DB is connected. Throws if connection fails.
     * @returns {Promise<void>}
     * @throws {Error} If connection cannot be established
     */
    requireConnected(): Promise<void>;
    /**
     * Searches for URI matching condition
     * @param {string | ((path: string) => boolean)} uri - Search pattern or callback
     * @param {number} [depth=0] - Maximum depth to search
     * @yields {string} Full URI path of found documents
     * @returns {AsyncGenerator<string, void, unknown>}
     */
    find(uri: string | ((path: string) => boolean), depth?: number | undefined): AsyncGenerator<string, void, unknown>;
    /**
     * Connects to the database. This method should be overridden by subclasses.
     * Initializes in-memory data from predefined and builds directory metadata.
     * @abstract
     * @returns {Promise<void>}
     */
    connect(): Promise<void>;
    /**
     * Gets document content from cache or loads if missing.
     * Supports default fallback value for missing documents.
     * @param {string} uri - Document URI
     * @param {object | GetOptions} [input] - Options or GetOptions instance
     * @param {AuthContext | object} [context=this.context] - Auth context
     * @returns {Promise<any>} Document content
     */
    get(uri: string, input?: object | GetOptions, context?: AuthContext | object): Promise<any>;
    /**
     * Sets document content in cache and updates metadata timestamp.
     * @param {string} uri - Document URI
     * @param {any} data - Document data
     * @param {AuthContext | object} [context=this.context] - Auth context
     * @returns {Promise<any>} The set data
     */
    set(uri: string, data: any, context?: AuthContext | object): Promise<any>;
    /**
     * Gets document statistics from cache or loads if missing.
     * Supports extension fallback for extension-less URIs.
     * @param {string} uri - Document URI
     * @param {AuthContext | object} [context=this.context] - Auth context
     * @returns {Promise<DocumentStat | undefined>}
     */
    stat(uri: string, context?: AuthContext | object): Promise<DocumentStat | undefined>;
    /**
     * Resolves path segments to absolute path
     * @note Must be overwritten by platform-specific implementation
     * @param  {...string} args - Path segments
     * @returns {Promise<string>} Resolved absolute path
     */
    resolve(...args: string[]): Promise<string>;
    /**
     * Normalize path segments to absolute path
     * Handles .., ., and duplicate slashes.
     * @param  {...string} args - Path segments
     * @returns {string} Normalized path
     */
    normalize(...args: string[]): string;
    /**
     * Checks if current uri has scheme in it, such as http://, https://, ftp://, file://, etc.
     * @param {string} uri
     * @returns {boolean}
     */
    isRemote(uri: string): boolean;
    /**
     * Checks if current uri is absolute (started from /) or remote.
     * @param {string} uri
     * @returns {boolean}
     */
    isAbsolute(uri: string): boolean;
    /**
     * Resolves path segments to absolute path synchronously
     * Combines cwd, root, and args with normalization.
     * @param  {...string} args - Path segments
     * @returns {string} Resolved absolute path
     */
    resolveSync(...args: string[]): string;
    /**
     * Returns base name of URI with the removedSuffix (if provided).
     * If removeSuffix is true the extension will be removed.
     * @param {string} uri
     * @param {string | true} [removeSuffix] - Suffix to remove or true for extension
     * @returns {string}
     */
    basename(uri: string, removeSuffix?: string | true | undefined): string;
    /**
     * Returns directory name of URI
     * @param {string} uri
     * @returns {string}
     */
    dirname(uri: string): string;
    /**
     * Gets absolute path
     * @note Must be overwritten by platform-specific implementation
     * @param  {...string} args - Path segments
     * @returns {string} Absolute path
     */
    absolute(...args: string[]): string;
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
    loadDocument(uri: string, defaultValue?: any, context?: AuthContext | object): Promise<any>;
    /**
     * Loads a document using a specific extension handler.
     * @param {string} ext The extension of the document.
     * @param {string} uri The URI to load the document from.
     * @param {any} defaultValue The default value to return if the document does not exist.
     * @param {AuthContext | object} [context=this.context] - Auth context
     * @returns {Promise<any>} The loaded document or the default value.
     */
    loadDocumentAs(ext: string, uri: string, defaultValue: any, context?: AuthContext | object): Promise<any>;
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
    saveDocument(uri: string, document: any, context?: AuthContext | object): Promise<boolean>;
    /**
     * Reads statistics for a specific document.
     * Must be overwritten to have the proper file or database document stat operation.
     * In a basic class it just returns a document stat from the db.meta map if exists.
     * @note Must be overwritten by platform-specific implementation
     * @param {string} uri - Document URI
     * @param {AuthContext | object} [context=this.context] - Auth context
     * @returns {Promise<DocumentStat>}
     */
    statDocument(uri: string, context?: AuthContext | object): Promise<DocumentStat>;
    /**
     * Writes data to a document with overwrite
     * @param {string} uri - Document URI
     * @param {string} chunk - Data to write
     * @param {AuthContext | object} [context=this.context] - Auth context
     * @returns {Promise<boolean>} Success status
     */
    writeDocument(uri: string, chunk: string, context?: AuthContext | object): Promise<boolean>;
    /**
     * Delete document from storage
     * @note Must be overwritten by platform specific application
     * @param {string} uri - Document URI
     * @param {AuthContext | object} [context=this.context] - Auth context
     * @returns {Promise<boolean>}
     */
    dropDocument(uri: string, context?: AuthContext | object): Promise<boolean>;
    /**
     * Ensures access to document with context.
     * Delegates to driver for authorization checks.
     * @param {string} uri - Document URI
     * @param {'r'|'w'|'d'} [level="r"] - Access level
     * @param {AuthContext | object} [context=this.context] - Auth context: { username, role, roles, user }
     * @returns {Promise<void>}
     * @throws {Error} - Access denied
     */
    ensureAccess(uri: string, level?: "r" | "w" | "d" | undefined, context?: AuthContext | object): Promise<void>;
    /**
     * Synchronize data with persistent storage
     * Saves changed documents where local mtime > remote stat mtime.
     * @param {string|undefined} [uri] Optional specific URI to save
     * @param {AuthContext | object} [context=this.context] - Auth context
     * @returns {Promise<string[]>} Array of saved URIs
     */
    push(uri?: string | undefined, context?: AuthContext | object): Promise<string[]>;
    /**
     * Moves a document from one URI to another URI
     * Loads source, saves to target, drops source, updates indexes.
     * @param {string} from - Source URI
     * @param {string} to - Target URI
     * @param {AuthContext | object} [context=this.context] - Auth context
     * @returns {Promise<boolean>} Success status
     */
    moveDocument(from: string, to: string, context?: AuthContext | object): Promise<boolean>;
    /**
     * Disconnect from database
     * Clears connection state. Subclasses should override for cleanup.
     * @returns {Promise<void>}
     */
    disconnect(): Promise<void>;
    /**
     * Lists immediate entries in a directory by scanning meta keys.
     * Filters to direct children only.
     * @param {string} uri - The directory URI (e.g., "content", ".", "dir/")
     * @param {AuthContext | object} [context=this.context] - Auth context
     * @returns {Promise<DocumentEntry[]>}
     * @throws {Error} If directory does not exist
     */
    listDir(uri: string, context?: AuthContext | object): Promise<DocumentEntry[]>;
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
    findStream(uri: string, options?: {
        context?: AuthContext | object;
        filter?: Function | undefined;
        limit?: number | undefined;
        sort?: "name" | "size" | "mtime" | undefined;
        order?: "asc" | "desc" | undefined;
        skipStat?: boolean | undefined;
        skipSymbolicLink?: boolean | undefined;
        load?: boolean | undefined;
    } | undefined): AsyncGenerator<StreamEntry, void, unknown>;
    /**
     * Returns TRUE if uri is a data file.
     * Checks against supported DATA_EXTNAMES.
     * @param {string} uri
     * @returns {boolean}
     */
    isData(uri: string): boolean;
    /**
     * Gets inheritance data for a given path
     * Loads and merges directory-level settings (e.g., _.json files) up the hierarchy.
     * Caches results to avoid redundant loads.
     * @param {string} path - Document path
     * @returns {Promise<any>} Inheritance data
     */
    getInheritance(path: string): Promise<any>;
    /**
     * Gets global variables for a given path, global variables are stored in _/ subdirectory
     * Traverses up hierarchy, loading files from _/ directories.
     * @param {string} path - Document path
     * @returns {Promise<any>} Global variables data
     */
    getGlobals(path: string): Promise<any>;
    /**
     * Fetch document with inheritance, globals and references processing
     * Handles extension lookup, directory resolution, and merging.
     * @param {string} uri
     * @param {object | FetchOptions} [input]
     * @param {AuthContext | object} [context=this.context] - Auth context
     * @returns {Promise<any>}
     */
    fetch(uri: string, input?: object | FetchOptions, context?: AuthContext | object): Promise<any>;
    /**
     * Merges data from multiple sources following nano-db-fetch patterns.
     * Handles inheritance, globals, and references with circular protection.
     * @param {string} uri - The URI to fetch and merge data for
     * @param {FetchOptions} [opts] - Fetch options
     * @param {AuthContext | Set<string>} [contextOrVisited] - Auth context or visited set
     * @param {Set<string>} [visited=new Set()] - For internal circular reference protection
     * @returns {Promise<any>} Merged data object
     */
    fetchMerged(uri: string, opts?: FetchOptions | undefined, contextOrVisited?: AuthContext | Set<string> | undefined, visited?: Set<string> | undefined): Promise<any>;
    _findReferenceKeys(flat: any): any;
    _getParentReferenceKey(key: any): any;
    /**
     * Handles document references and resolves them recursively with circular reference protection.
     * Supports fragment references (e.g., #prop/subprop) and merges siblings.
     * @param {object} data - Document data with potential references
     * @param {string} [basePath] - Base path for resolving relative references
     * @param {object|FetchOptions} [opts] - Options that will be passed to fetch
     * @param {Set<string>} [visited] - Set of visited URIs to prevent circular references
     * @returns {Promise<object>} Data with resolved references
     */
    resolveReferences(data: object, basePath?: string | undefined, opts?: object | FetchOptions, visited?: Set<string> | undefined): Promise<object>;
    /**
     * Auto-updates index.jsonl and index.txt after document save for all parent directories
     * @param {string} uri - URI of saved document
     * @returns {Promise<void>}
     */
    _updateIndex(uri: string): Promise<void>;
    /**
     * Saves index data to both index.jsonl and index.txt files
     * @param {string} dirUri Directory URI where indexes should be saved
     * @param {Array<[string, DocumentStat]>} [entries] Document entries with their paths, if not provided this.meta is used.
     * @returns {Promise<void>}
     */
    saveIndex(dirUri: string, entries?: [string, DocumentStat][] | undefined): Promise<void>;
    /**
     * Loads index data from either index.jsonl or index.txt file
     * @param {string} [dirUri] Directory URI where index file is located
     * @returns {Promise<DirectoryIndex>} Index data.
     */
    loadIndex(dirUri?: string | undefined): Promise<DirectoryIndex>;
    #private;
}
import DBDriverProtocol from './DriverProtocol.js';
import DocumentStat from '../DocumentStat.js';
import AuthContext from './AuthContext.js';
import { NoConsole } from '@nan0web/log';
import Data from '../Data.js';
import Directory from '../Directory.js';
import DirectoryIndex from '../DirectoryIndex.js';
import GetOptions from './GetOptions.js';
import DocumentEntry from '../DocumentEntry.js';
import StreamEntry from '../StreamEntry.js';
import FetchOptions from './FetchOptions.js';
