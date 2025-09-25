export default DirectoryIndex;
declare class DirectoryIndex {
    static ENTRIES_AS_TXT: string;
    static ENTRIES_AS_TXTL: string;
    static COLUMNS: string[];
    static FULL_INDEX: string;
    static INDEX: string;
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
     * Creates DirectoryIndex instance from input
     * @param {object|DirectoryIndex} input
     * @returns {DirectoryIndex}
     */
    static from(input: object | DirectoryIndex): DirectoryIndex;
    /**
     * @param {object} input
     * @param {Array<[string, DocumentStat]> | string[][] | string[] | string} [input.entries=[]]
     * @param {string} [input.entriesAs=DirectoryIndex.ENTRIES_AS_TXT]
     */
    constructor(input?: {
        entries?: string | string[] | string[][] | [string, DocumentStat][] | undefined;
        entriesAs?: string | undefined;
    });
    /** @type {string[]} */
    entriesColumns: string[];
    /** @type {string} */
    entriesAs: string;
    /** @type {Array<[string, DocumentStat]>} */
    entries: Array<[string, DocumentStat]>;
    /** @returns {string} */
    get ENTRIES_AS_TXT(): string;
    /** @returns {string} */
    get ENTRIES_AS_TXTL(): string;
    /**
     * Encodes entries as simple space-separated rows (for immediate directory)
     * @param {Array<[string, DocumentStat]>} entries - Entries to encode
     * @returns {string[]} Encoded rows
     */
    encodeIntoTxt(entries: Array<[string, DocumentStat]>): string[];
    /**
     * Encodes entries using contextual hierarchical format (optimized)
     * @param {Array<[string, DocumentStat]>} entries - Entries to encode
     * @returns {string[]} Contextual encoded rows
     */
    encodeIntoTxtl(entries: Array<[string, DocumentStat]>): string[];
    /**
     * Returns the directory context for a path
     * @param {string} path
     * @returns {string}
     */
    _getPathContext(path: string): string;
    /**
     * Calculates statistics for a directory context
     * @param {Array<[string, DocumentStat]>} entries
     * @param {string} context
     * @returns {DocumentStat}
     */
    _calculateContextStat(entries: Array<[string, DocumentStat]>, context: string): DocumentStat;
    /**
     * Safely encodes a value
     * @param {DocumentStat} stat
     * @param {string} field
     * @param {number} radix
     * @returns {string}
     */
    _encodeValue(stat: DocumentStat, field: string, radix: number): string;
    /**
     * Encodes entries according to specified format
     * @param {Object} [input]
     * @param {Array<[string, DocumentStat]>} [input.entries=this.entries] - Entries to encode
     * @returns {string} Encoded entries as a string
     */
    encode({ entries }?: {
        entries?: [string, DocumentStat][] | undefined;
    } | undefined): string;
    /**
     * Decodes entries from stored format back to [name, DocumentStat] pairs
     * @param {any|Array<[string, DocumentStat]>} source - Source data to decode
     * @returns {Array<[string, DocumentStat]>} Decoded entries
     */
    decode(source: any | Array<[string, DocumentStat]>): Array<[string, DocumentStat]>;
    /**
     * Decodes flat single-level format (txt)
     * @param {string} source
     * @returns {Array<[string, DocumentStat]>}
     */
    _decodeTxt(source: string): Array<[string, DocumentStat]>;
    /**
     * Decodes contextual hierarchical format (txtl)
     * @param {string} source
     * @returns {Array<[string, DocumentStat]>}
     */
    _decodeTxtl(source: string): Array<[string, DocumentStat]>;
}
import DocumentStat from "./DocumentStat.js";
