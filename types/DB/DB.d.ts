/**
 * Base database class for document storage and retrieval
 * @class
 */
export default class DB {
    static Data: typeof Data;
    static Directory: typeof Directory;
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
    constructor(input?: {
        root?: string | undefined;
        cwd?: string | undefined;
        connected?: boolean | undefined;
        data?: Map<string, any> | undefined;
        meta?: Map<string, DocumentStat> | undefined;
        predefined?: Map<string, any> | undefined;
        dbs?: DB[] | undefined;
        console?: Console | NoConsole | undefined;
    });
    /** @type {string} */
    encoding: string;
    /** @type {Map<string, any | false>} */
    data: Map<string, any | false>;
    /** @type {Map<string, DocumentStat>} */
    meta: Map<string, DocumentStat>;
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
    get Data(): typeof Data;
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
    get Directory(): typeof Directory;
    /**
     * @returns {typeof DirectoryIndex}
     */
    get Index(): typeof DirectoryIndex;
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
    get GetOptions(): typeof GetOptions;
    /**
     * Attaches another DB instance
     * @param {DB} db - Database to attach
     * @returns {void}
     */
    attach(db: DB): void;
    /**
     * Detaches a database
     * @param {DB} db - Database to detach
     * @returns {DB[]|boolean} Array of detached database or false if not found
     */
    detach(db: DB): DB[] | boolean;
    /**
     * Creates a new DB instance with a subset of the data and meta.
     * @param {string} uri The URI to extract from the current DB.
     * @returns {DB}
     */
    extract(uri: string): DB;
    /**
     * Extracts file extension with leading dot from URI
     * @param {string} uri
     * @returns {string}
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
     * @returns {string}
     */
    toString(): string;
    /**
     * Dumps current database into destination database.
     * @param {DB} dest
     * @param {object} [options]
     * @param {({ uri, url, data, current, total }) => void} [options.onProgress]
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
     * @param {string} dir
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
     * @async
     * @generator
     * @param {string} uri - The URI of the directory to read
     * @param {object} options - Read directory options
     * @param {number} [options.depth=-1] - The depth to which subdirectories should be read (-1 means unlimited)
     * @param {boolean} [options.skipStat=false] - Whether to skip collecting file statistics
     * @param {boolean} [options.includeDirs=false] - Whether to skip or include directories.
     * @param {boolean} [options.skipSymbolicLink=false] - Whether to skip symbolic links
     * @param {Function} [options.filter] - A filter function to apply to directory entries
     * @yields {DocumentEntry}
     * @returns {AsyncGenerator<DocumentEntry, void, unknown>}
     */
    readDir(uri: string, options?: {
        depth?: number | undefined;
        skipStat?: boolean | undefined;
        includeDirs?: boolean | undefined;
        skipSymbolicLink?: boolean | undefined;
        filter?: Function | undefined;
    }): AsyncGenerator<DocumentEntry, void, unknown>;
    /**
     * Reads a specific branch at given depth
     * @param {string} uri - URI for the branch
     * @param {number} [depth=-1] - Depth of read
     * @returns {Promise<AsyncGenerator<DocumentEntry, void, unknown>>}
     */
    readBranch(uri: string, depth?: number | undefined): Promise<AsyncGenerator<DocumentEntry, void, unknown>>;
    /**
     * Ensures DB is connected
     * @returns {Promise<void>}
     */
    requireConnected(): Promise<void>;
    /**
     * Searches for URI matching condition
     * @param {string | ((key: string, value: any) => boolean)} uri - Search pattern or callback
     * @param {number} [depth=0] - Maximum depth to search
     * @yields {string} Full URI path of found documents
     * @returns {AsyncGenerator<string, void, unknown>}
     */
    find(uri: string | ((key: string, value: any) => boolean), depth?: number | undefined): AsyncGenerator<string, void, unknown>;
    /**
     * Connects to the database. This method should be overridden by subclasses.
     * @abstract
     * @returns {Promise<void>}
     */
    connect(): Promise<void>;
    /**
     * Gets document content
     * @param {string} uri - Document URI
     * @param {object | GetOptions} [opts] - Options.
     * @returns {Promise<any>} Document content
     */
    get(uri: string, opts?: object | GetOptions): Promise<any>;
    /**
     * Sets document content
     * @param {string} uri - Document URI
     * @param {any} data - Document data
     * @returns {Promise<any>} Document content
     */
    set(uri: string, data: any): Promise<any>;
    /**
     * Gets document statistics
     * @param {string} uri - Document URI
     * @returns {Promise<DocumentStat | undefined>}
     */
    stat(uri: string): Promise<DocumentStat | undefined>;
    /**
     * Resolves path segments to absolute path
     * @note Must be overwritten by platform-specific implementation
     * @param  {...string} args - Path segments
     * @returns {Promise<string>} Resolved absolute path
     */
    resolve(...args: string[]): Promise<string>;
    /**
     * Normalize path segments to absolute path
     * @param  {...string} args - Path segments
     * @returns {string} Normalized path
     */
    normalize(...args: string[]): string;
    /**
     * Checks if current uri has shceme in it, such as http://, https://, ftp://, file://, etc.
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
     * @param  {...string} args - Path segments
     * @returns {string} Resolved absolute path
     */
    resolveSync(...args: string[]): string;
    /**
     * Returns base name of URI with the removedSuffix (if provided).
     * If removeSuffix is true the extension will be removed.
     * @param {string} uri
     * @param {string | true} [removeSuffix]
     * @returns {string}
     */
    basename(uri: string, removeSuffix?: string | true | undefined): string;
    dirname(uri: any): string;
    /**
     * Gets absolute path
     * @note Must be overwritten by platform-specific implementation
     * @param  {...string} args - Path segments
     * @returns {string} Absolute path
     */
    absolute(...args: string[]): string;
    /**
     * Loads a document.
     * Must be overwritten to has the proper file or database document read operation.
     * In a basic class it just loads already saved data in the db.data map.
     * @param {string} uri - Document URI
     * @param {any} [defaultValue] - Default value if document not found
     * @returns {Promise<any>}
     */
    loadDocument(uri: string, defaultValue?: any): Promise<any>;
    /**
     * Loads a document using a specific extension handler.
     * @param {string} ext The extension of the document.
     * @param {string} uri The URI to load the document from.
     * @param {any} defaultValue The default value to return if the document does not exist.
     * @returns {Promise<any>} The loaded document or the default value.
     */
    loadDocumentAs(ext: string, uri: string, defaultValue: any): Promise<any>;
    /**
     * Saves a document.
     * Must be overwritten to has the proper file or database document save operation.
     * In a basic class it just sets a document in the db.data map and db.meta map.
     * @param {string} uri - Document URI
     * @param {any} document - Document data
     * @returns {Promise<boolean>}
     */
    saveDocument(uri: string, document: any): Promise<boolean>;
    /**
     * Reads statistics for a specific document.
     * Must be overwritten to has the proper file or database document stat operation.
     * In a basic class it just returns a document stat from the db.meta map if exists.
     * @note Must be overwritten by platform-specific implementation
     * @param {string} uri - Document URI
     * @returns {Promise<DocumentStat>}
     */
    statDocument(uri: string): Promise<DocumentStat>;
    /**
     * Writes data to a document with overwrite
     * @param {string} uri - Document URI
     * @param {string} chunk - Data to write
     * @returns {Promise<boolean>} Success status
     */
    writeDocument(uri: string, chunk: string): Promise<boolean>;
    /**
     * Delete document from storage
     * @note Must be overwritten by platform specific application
     * @param {string} uri - Document URI
     * @returns {Promise<boolean>}
     * Always returns false for base implementation not knowing
     * to implement delete on top of generic interface
     */
    dropDocument(uri: string): Promise<boolean>;
    /**
     * Ensures access for given URI and level, if not @throws an error.
     * @note Must be overwritten by platform specific application
     * @param {string} uri - Document URI
     * @param {string} [level='r'] Access level
     * @returns {Promise<void>}
     */
    ensureAccess(uri: string, level?: string | undefined): Promise<void>;
    /**
     * Synchronize data with persistent storage
     * @param {string|undefined} [uri] Optional specific URI to save
     * @returns {Promise<string[]>} Array of saved URIs
     */
    push(uri?: string | undefined): Promise<string[]>;
    /**
     * Moves a document from one URI to another URI
     * @param {string} from - Source URI
     * @param {string} to - Target URI
     * @returns {Promise<boolean>} Success status
     */
    moveDocument(from: string, to: string): Promise<boolean>;
    /**
     * Disconnect from database
     * @returns {Promise<void>}
     */
    disconnect(): Promise<void>;
    /**
     * Lists immediate entries in a directory by scanning meta keys.
     * @param {string} uri - The directory URI (e.g., "content", ".", "dir/")
     * @returns {Promise<DocumentEntry[]>}
     * @throws {Error} If directory does not exist
     */
    listDir(uri: string): Promise<DocumentEntry[]>;
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
     * @param {boolean} [options.load=false] - Load data files into memory
     * @yields {StreamEntry} Progress state
     * @returns {AsyncGenerator<StreamEntry, void, unknown>}
     */
    findStream(uri: string, options?: {
        filter?: Function | undefined;
        limit?: number | undefined;
        sort?: "size" | "name" | "mtime" | undefined;
        order?: "asc" | "desc" | undefined;
        skipStat?: boolean | undefined;
        skipSymbolicLink?: boolean | undefined;
        load?: boolean | undefined;
    }): AsyncGenerator<StreamEntry, void, unknown>;
    /**
     * Returns TRUE if uri is a data file.
     * @param {string} uri
     * @returns {boolean}
     */
    isData(uri: string): boolean;
    /**
     * Gets inheritance data for a given path
     * @param {string} path - Document path
     * @returns {Promise<any>} Inheritance data
     */
    getInheritance(path: string): Promise<any>;
    /**
     * Gets global variables for a given path, global variables are stored in _/ subdirectory
     * @param {string} path - Document path
     * @returns {Promise<any>} Global variables data
     */
    getGlobals(path: string): Promise<any>;
    /**
     * Fetch document with inheritance, globals and references processing
     * @param {string} uri
     * @param {object | FetchOptions} [opts]
     * @returns {Promise<any>}
     */
    fetch(uri: string, opts?: object | FetchOptions): Promise<any>;
    /**
     * Merges data from multiple sources following nano-db-fetch patterns.
     * @param {string} uri - The URI to fetch and merge data for
     * @param {FetchOptions} [opts] - Fetch options
     * @param {Set<string>} [visited] - For internal circular reference protection
     * @returns {Promise<any>} Merged data object
     */
    fetchMerged(uri: string, opts?: FetchOptions | undefined, visited?: Set<string> | undefined): Promise<any>;
    _findReferenceKeys(flat: any): any;
    _getParentReferenceKey(key: any): any;
    /**
     * Handles document references and resolves them recursively with circular reference protection.
     * @param {object} data - Document data with potential references
     * @param {string} [basePath] - Base path for resolving relative references
     * @param {object|FetchOptions} [opts] - Options that will be passed to fetch
     * @param {Set<string>} [visited] - Set of visited URIs to prevent circular references
     * @returns {Promise<object>} Data with resolved references
     */
    resolveReferences(data: object, basePath?: string | undefined, opts?: object | FetchOptions, visited?: Set<string> | undefined): Promise<object>;
    /**
 * @private
 * Auto-updates index.jsonl and index.txt after document save
 * @param {string} uri - URI of saved document
 * @returns {Promise<void>}
 */
    private _updateIndex0;
    /**
     * @private
     * Auto-updates index.jsonl and index.txt after document save for all parent directories
     * @param {string} uri - URI of saved document
     * @returns {Promise<void>}
     */
    private _updateIndex;
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
import DocumentStat from "../DocumentStat.js";
import { NoConsole } from "@nan0web/log";
import Data from "../Data.js";
import Directory from "../Directory.js";
import DirectoryIndex from "../DirectoryIndex.js";
import GetOptions from "./GetOptions.js";
import DocumentEntry from "../DocumentEntry.js";
import StreamEntry from "../StreamEntry.js";
import FetchOptions from "./FetchOptions.js";
