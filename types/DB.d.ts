export default DB;
/**
 * Base database class for document storage and retrieval
 * @class
 */
declare class DB {
    /**
     * Creates a new DB instance from properties if object provided
     * @param {object|DB} props - Properties or DB instance
     * @returns {DB}
     */
    static from(props: object | DB): DB;
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
     * @param {Map<string, DocumentEntry | false>} [input.data=new Map()]
     * @param {Map<string, DocumentStat>} [input.meta=new Map()]
     * @param {DB[]} [input.dbs=[]]
     */
    constructor(input?: {
        root?: string | undefined;
        cwd?: string | undefined;
        connected?: boolean | undefined;
        data?: Map<string, false | DocumentEntry> | undefined;
        meta?: Map<string, DocumentStat> | undefined;
        dbs?: DB[] | undefined;
    });
    /** @type {string} */
    encoding: string;
    /** @type {Map<string, DocumentEntry | false>} */
    data: Map<string, DocumentEntry | false>;
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
     * For example 'file.txt' -> '.txt'
     * @param {string} uri
     * @returns {string}
     */
    extname(uri: string): string;
    /**
     * Relative path resolver for file systems.
     * Must be implemented by platform specific code
     * @throws Not implemented in base class
     * @param {string} from Base directory path
     * @param {string} to Target directory path
     * @returns {string} Relative path
     */
    relative(from: string, to: string): string;
    /**
     * Get string representation of the database
     * @returns {string}
     */
    toString(): string;
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
    readDir(uri?: string, options?: {
        depth?: number | undefined;
        skipStat?: boolean | undefined;
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
     * Connect to database
     * @abstract
     * @returns {Promise<void>}
     * Platform specific implementation of connecting to the database
     */
    connect(): Promise<void>;
    /**
     * Gets document content
     * @param {string} uri - Document URI
     * @returns {Promise<any>} Document content
     */
    get(uri: string): Promise<any>;
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
     * Resolves path segments to absolute path synchronously
     * @param  {...string} args - Path segments
     * @returns {string} Resolved absolute path
     */
    resolveSync(...args: string[]): string;
    /**
     * Gets absolute path
     * @note Must be overwritten by platform-specific implementation
     * @param  {...string} args - Path segments
     * @returns {string} Absolute path
     */
    absolute(...args: string[]): string;
    /**
     * Loads a document
     * @param {string} uri - Document URI
     * @param {any} [defaultValue=""] - Default value if document not found
     * @returns {Promise<any>}
     */
    loadDocument(uri: string, defaultValue?: any): Promise<any>;
    /**
     * Saves a document
     * @param {string} uri - Document URI
     * @param {any} document - Document data
     * @returns {Promise<boolean>}
     */
    saveDocument(uri: string, document: any): Promise<boolean>;
    /**
     * Creates DocumentStat for a specific document
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
     * Ensures access for given URI and level
     * @note Must be overwritten by platform specific application
     * @param {string} uri - Document URI
     * @param {string} [level='r'] Access level
     * @returns {Promise<boolean>}
     */
    ensureAccess(uri: string, level?: string | undefined): Promise<boolean>;
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
     * Lists directory entries
     * @param {string} uri - Directory URI
     * @param {Object} options - List options
     * @param {number} [options.depth] - Depth to list
     * @param {boolean} [options.skipStat] - Skip statistics collection
     * @param {boolean} [options.skipSymbolicLink] - Skip symbolic links
     * @returns {Promise<{name: string, stat: DocumentStat, isDirectory: boolean}[]>} Directory entries
     */
    listDir(uri: string, { depth, skipStat, skipSymbolicLink }?: {
        depth?: number | undefined;
        skipStat?: boolean | undefined;
        skipSymbolicLink?: boolean | undefined;
    }): Promise<{
        name: string;
        stat: DocumentStat;
        isDirectory: boolean;
    }[]>;
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
    findStream(uri: string, options?: {
        filter?: Function | undefined;
        limit?: number | undefined;
        sort?: "size" | "name" | "mtime" | undefined;
        order?: "asc" | "desc" | undefined;
        skipStat?: boolean | undefined;
        skipSymbolicLink?: boolean | undefined;
    }): AsyncGenerator<StreamEntry, void, unknown>;
}
import DocumentEntry from "./DocumentEntry.js";
import DocumentStat from "./DocumentStat.js";
import StreamEntry from "./StreamEntry.js";
