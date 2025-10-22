export default DirectoryIndex;
declare class DirectoryIndex {
    static COLUMNS: string[];
    static FULL_INDEX: string;
    static INDEX: string;
    static Directory: typeof Directory;
    /**
     * Encodes into string rows
     * @param {Array<[string, DocumentStat]>} entries - Entries to encode
     * @param {string[]} [columns=this.COLUMNS] - Columns to return
     * @param {boolean} [inc=false] - Is path incremental or full
     * @returns {string[]}
     */
    static encodeRows(entries: Array<[string, DocumentStat]>, columns?: string[] | undefined, inc?: boolean | undefined): string[];
    /**
     * Checks if a given path represents an index.
     * @param {string} path
     * @returns {boolean}
     */
    static isIndex(path: string): boolean;
    /**
     * Checks if a given path represents a full index.
     * @param {string} path
     * @returns {boolean}
     */
    static isFullIndex(path: string): boolean;
    /**
     * Get all indexes that need to be updated when a document changes
     * @param {import("./DB/DB.js").default} db
     * @param {string} uri
     * @returns {string[]}
     */
    static getIndexesToUpdate(db: import("./DB/DB.js").default, uri: string): string[];
    /**
     * Get directory entries (immediate children only)
     * @param {import("./DB/DB.js").default} db
     * @param {string} dirPath
     * @returns {Promise<Array<[string, DocumentStat]>>}
     */
    static getDirectoryEntries(db: import("./DB/DB.js").default, dirPath: string): Promise<Array<[string, DocumentStat]>>;
    /**
     * Generate indexes for a directory and its subdirectories recursively
     * @param {import("./DB/DB.js").default} db
     * @param {string} dirPath
     * @returns {AsyncGenerator<[string, DirectoryIndex], void, unknown>}
     */
    static generateAllIndexes(db: import("./DB/DB.js").default, dirPath?: string): AsyncGenerator<[string, DirectoryIndex], void, unknown>;
    /**
     * Fallback method to collect all entries if meta is not loaded
     * @param {import("./DB/DB.js").default} db
     * @param {string} dirPath
     * @returns {Promise<Array<[string, DocumentStat]>>}
     */
    static _getAllEntriesFallback(db: import("./DB/DB.js").default, dirPath: string): Promise<Array<[string, DocumentStat]>>;
    /**
     * Decodes entries from stored format back to [name, DocumentStat] pairs and returns them in the index
     * @param {string|object} source - Source data to decode
     * @returns {DirectoryIndex}
     */
    static decode(source: string | object): DirectoryIndex;
    /**
     * Creates DirectoryIndex instance from input
     * @param {object|DirectoryIndex} input
     * @returns {DirectoryIndex}
     */
    static from(input: object | DirectoryIndex): DirectoryIndex;
    /**
     * Returns directory for current path.
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
     * Encodes entries according to specified format
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
import DocumentStat from "./DocumentStat.js";
import Directory from "./Directory.js";
