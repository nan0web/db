/**
 * DirectoryIndex manages encoding/decoding of directory listings for efficient traversal.
 * Supports TXT (immediate children) and TXTL (hierarchical full tree) formats.
 * Used by DB for building and loading indexes like index.txt and index.txtl.
 *
 * Formats:
 * - TXT: Flat listing of direct children (e.g., "file.txt mtime size")
 * - TXTL: Hierarchical with context (long paths, incremental relative)
 *
 * Columns: name, mtimeMs.36 (base-36 encoded timestamp), size.36 (base-36 size)
 * Base-36 reduces file size for indexes.
 *
 * Usage:
 * ```js
 * const index = new DirectoryIndex({ entries: [['file.txt', stat]] });
 * const encoded = index.encode({ long: true }); // TXTL format
 * const decoded = DirectoryIndex.decode(encoded); // Back to entries
 * ```
 *
 * @class DirectoryIndex
 */
export default class DirectoryIndex {
    /** @type {string[]} Default columns for encoding: name, mtimeMs.36, size.36 */
    static COLUMNS: string[];
    /** @type {string} Full hierarchical index filename */
    static FULL_INDEX: string;
    /** @type {string} Immediate children index filename */
    static INDEX: string;
    /** @type {typeof Directory} */
    static Directory: typeof Directory;
    /**
     * Encodes entries into string rows using specified columns and radix.
     * Sorts entries alphabetically; handles directories with trailing slash.
     * @param {Array<[string, DocumentStat]>} entries - Entries to encode
     * @param {string[]} [columns=this.COLUMNS] - Columns to return
     * @param {boolean} [inc=false] - Is path incremental or full
     * @returns {string[]} Array of encoded rows.
     */
    static encodeRows(entries: Array<[string, DocumentStat]>, columns?: string[] | undefined, inc?: boolean | undefined): string[];
    /**
     * Checks if a given path represents an index.
     * Matches index.txt or dir/index.txt.
     * @param {string} path
     * @returns {boolean}
     */
    static isIndex(path: string): boolean;
    /**
     * Checks if a given path represents a full index.
     * Matches index.txtl or dir/index.txtl.
     * @param {string} path
     * @returns {boolean}
     */
    static isFullIndex(path: string): boolean;
    /**
     * Get all indexes that need to be updated when a document changes
     * Traverses up the directory tree to find affected indexes.
     * @param {import("./DB/DB.js").default} db
     * @param {string} uri
     * @returns {string[]} Array of index URIs to update
     */
    static getIndexesToUpdate(db: import("./DB/DB.js").default, uri: string): string[];
    /**
     * Get directory entries (immediate children only)
     * Filters to direct descendants; skips indexes to avoid recursion.
     * @param {import("./DB/DB.js").default} db
     * @param {string} dirPath
     * @returns {Promise<Array<[string, DocumentStat]>>}
     */
    static getDirectoryEntries(db: import("./DB/DB.js").default, dirPath: string): Promise<Array<[string, DocumentStat]>>;
    /**
     * Generate indexes for a directory and its subdirectories recursively
     * Yields [uri, DirectoryIndex] for TXT per dir and one TXTL at root.
     * @param {import("./DB/DB.js").default} db
     * @param {string} dirPath
     * @returns {AsyncGenerator<[string, DirectoryIndex], void, unknown>}
     */
    static generateAllIndexes(db: import("./DB/DB.js").default, dirPath?: string): AsyncGenerator<[string, DirectoryIndex], void, unknown>;
    /**
     * Fallback method to collect all entries if meta is not loaded
     * Scans via readDir if no cache.
     * @param {import("./DB/DB.js").default} db
     * @param {string} dirPath
     * @returns {Promise<Array<[string, DocumentStat]>>}
     */
    static _getAllEntriesFallback(db: import("./DB/DB.js").default, dirPath: string): Promise<Array<[string, DocumentStat]>>;
    /**
     * Decodes entries from stored format back to [name, DocumentStat] pairs and returns them in the index
     * Handles headers for columns, long/inc modes; builds full paths from context.
     * @param {string|object} source - Source data to decode
     * @returns {DirectoryIndex}
     */
    static decode(source: string | object): DirectoryIndex;
    /**
     * Creates DirectoryIndex instance from input
     * Handles string (decode), object (new), or existing instance.
     * @param {string | Partial<DirectoryIndex>} input
     * @returns {DirectoryIndex}
     */
    static from(input: string | Partial<DirectoryIndex>): DirectoryIndex;
    /**
     * Returns directory for current path.
     * Similar to path.dirname but handles root as '.'.
     * @param {string} path
     * @returns {string}
     */
    static dirname(path: string): string;
    /**
     * @param {object} input
     * @param {Array<[string, DocumentStat]>} [input.entries=[]]
     * @param {string[]} [input.columns=DirectoryIndex.COLUMNS]
     */
    constructor(input?: {
        entries?: [string, DocumentStat][] | undefined;
        columns?: string[] | undefined;
    });
    /** @type {string[]} */
    columns: string[];
    /** @type {Array<[string, DocumentStat]>} */
    entries: Array<[string, DocumentStat]>;
    get Directory(): typeof Directory;
    /**
     * Encodes index according to specified format.
     * Supports flat TXT, hierarchical TXTL (full/long paths), and incremental relative paths.
     * Adds headers for custom columns, long/inc modes.
     * @param {Object} [input]
     * @param {Array<[string, DocumentStat]>} [input.entries=this.entries] - Entries to encode
     * @param {string} [input.dir="."] - Directory to start with.
     * @param {boolean} [input.long=false] - Generates all the children maps if long is TRUE, otherwise only current directory.
     * @param {boolean} [input.inc=false] - If TRUE, uses incremental path format (no duplicate dir prefixes)
     * @returns {string} Encoded entries as a string
     */
    encode({ entries, dir, long, inc }?: {
        entries?: [string, DocumentStat][] | undefined;
        dir?: string | undefined;
        long?: boolean | undefined;
        inc?: boolean | undefined;
    } | undefined): string;
}
import DocumentStat from './DocumentStat.js';
import Directory from './Directory.js';
