export default DirectoryIndex;
declare class DirectoryIndex {
    static ENTRIES_AS_ARRAY: string;
    static ENTRIES_AS_OBJECT: string;
    static ENTRIES_AS_ROWS: string;
    static ENTRIES_AS_TEXT: string;
    static COLUMNS: string[];
    static FULL_INDEX: string;
    static INDEX: string;
    static Filter: typeof DirectoryIndexFilter;
    /**
     * Creates DirectoryIndex instance from input
     * @param {object|DirectoryIndex} input - Properties or existing instance
     * @returns {DirectoryIndex}
     */
    static from(input: object | DirectoryIndex): DirectoryIndex;
    /**
     * Checks if a given path represents an index.
     *
     * @param {string} path
     * @returns {boolean} True if the path is an index
     */
    static isIndex(path: string): boolean;
    /**
     * Checks if a given path represents a full index.
     *
     * @param {string} path
     * @returns {boolean} True if the path is a full index
     */
    static isFullIndex(path: string): boolean;
    /**
     * Get all indexes that need to be updated when a document changes
     * @param {import("./DB/DB.js").default} db - Database instance
     * @param {string} uri - URI of the changed document
     * @returns {string[]} Array of index URIs to update
     */
    static getIndexesToUpdate(db: import("./DB/DB.js").default, uri: string): string[];
    /**
     * Get directory entries (immediate children only)
     * @param {import("./DB/DB.js").default} db - Database instance
     * @param {string} dirPath - Path of directory to get entries for
     * @returns {Promise<Array<[string, DocumentStat]>>} Array of directory entries
     */
    static getDirectoryEntries(db: import("./DB/DB.js").default, dirPath: string): Promise<Array<[string, DocumentStat]>>;
    /**
     * Get all entries recursively from a directory and its subdirectories
     * @param {import("./DB/DB.js").default} db - Database instance
     * @param {string} dirPath - Path of directory to get all entries for
     * @returns {Promise<Array<[string, DocumentStat]>>} Array of all directory entries
     */
    static getAllEntries(db: import("./DB/DB.js").default, dirPath?: string): Promise<Array<[string, DocumentStat]>>;
    /**
     * Generate indexes for a directory and its subdirectories recursively
     * @param {import("./DB/DB.js").default} db - Database instance
     * @param {string} dirPath - Path of directory to index
     * @returns {AsyncGenerator<[string, DirectoryIndex], void, unknown>} Generator of [indexUri, directoryIndex] pairs
     */
    static generateAllIndexes(db: import("./DB/DB.js").default, dirPath?: string): AsyncGenerator<[string, DirectoryIndex], void, unknown>;
    /**
     * When entriesColumns fulfilled — indexes are stored as string[][] in data files
     * instead of Record<string, object>
     * @param {object} input
     * @param {string[]} [input.entriesColumns=[]]
     * @param {Array<[string, DocumentStat]> | string[][] | string[] | string} [input.entries=[]]
     * @param {string} [input.entriesAs]
     * @param {number} [input.maxEntriesOnLoad=12]
     * @param {object} [input.filter]
     */
    constructor(input?: {
        entriesColumns?: string[] | undefined;
        entries?: string | string[] | string[][] | [string, DocumentStat][] | undefined;
        entriesAs?: string | undefined;
        maxEntriesOnLoad?: number | undefined;
        filter?: object;
    });
    /** @type {string[]} */
    entriesColumns: string[];
    /** @type {string} */
    entriesAs: string;
    /** @type {Array<[string, DocumentStat]>} */
    entries: Array<[string, DocumentStat]>;
    /** @type {number} */
    maxEntriesOnLoad: number;
    /** @type {DirectoryIndexFilter} */
    filter: DirectoryIndexFilter;
    /** @returns {string} */
    get ENTRIES_AS_ARRAY(): string;
    /** @returns {string} */
    get ENTRIES_AS_OBJECT(): string;
    /** @returns {string} */
    get ENTRIES_AS_ROWS(): string;
    /** @returns {string} */
    get ENTRIES_AS_TEXT(): string;
    /** @returns {string[]} */
    get ENTRIES_AS_ALL(): string[];
    get FULL_INDEX(): string;
    get INDEX(): string;
    /**
     * Encodes a component string for safe storage
     * @param {string} str - String to encode
     * @returns {string} Encoded string
     */
    encodeComponent(str: string): string;
    /**
     * Encodes entries as array format with columns
     * @param {Array<[string, DocumentStat]>} entries - Entries to encode
     * @returns {string[][]} Encoded entries
     */
    encodeIntoArray(entries: Array<[string, DocumentStat]>): string[][];
    /**
     * Encodes entries as rows format
     * @param {Array<[string, DocumentStat]>} entries - Entries to encode
     * @param {string} [divider=" "] - Divider character
     * @returns {string[]} Encoded rows
     */
    encodeIntoRows(entries: Array<[string, DocumentStat]>, divider?: string | undefined): string[];
    /**
     * Encodes entries according to specified format
     * @param {Object} [input]
     * @param {Array<[string, DocumentStat]>} [input.entries] - Entries to encode, or current entries
     * @param {string} [input.target] - Target encoding format, or current entriesAs
     * @returns {string[][] | string[] | string | Array<[string, DocumentStat]>} Encoded entries
     */
    encode({ entries, target }?: {
        entries?: [string, DocumentStat][] | undefined;
        target?: string | undefined;
    } | undefined): string[][] | string[] | string | Array<[string, DocumentStat]>;
    /**
     * Decodes entries from stored format back to [name, DocumentStat] pairs
     * @param {Object} [input]
     * @param {any} [input.source=this.entries] - Source data to decode
     * @param {string} [input.target] - Target encoding format, or current entriesAs
     * @returns {Array<[string, DocumentStat]>} Decoded entries
     */
    decode({ source, target }?: {
        source?: any;
        target?: string | undefined;
    } | undefined): Array<[string, DocumentStat]>;
}
import DocumentStat from "./DocumentStat.js";
declare class DirectoryIndexFilter {
    /**
     * @param {object} input
     * @returns {DirectoryIndexFilter}
     */
    static from(input: object): DirectoryIndexFilter;
    constructor(input?: {});
}
