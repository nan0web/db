export default DocumentEntry;
/**
 * Represents a document entry in the filesystem or database.
 * Combines path info (name, parent, depth) with stats (size, type, timestamps).
 * Used in directory listings from readDir/listDir.
 *
 * Auto-derives name/parent/depth from path if not provided.
 * Fulfilled indicates if stat data is complete (exists check).
 *
 * Usage:
 * ```js
 * const entry = new DocumentEntry({ path: 'file.txt', stat: new DocumentStat({ isFile: true }) });
 * entry.isFile; // true
 * entry.toString(); // 'F file.txt'
 * ```
 *
 * @class
 */
declare class DocumentEntry {
    /**
     * Creates a DocumentEntry from input
     * Handles plain objects or existing instances.
     * @param {object|DocumentEntry} input
     * @returns {DocumentEntry}
     */
    static from(input: object | DocumentEntry): DocumentEntry;
    /**
     * Creates a new DocumentEntry instance
     * @param {object} input
     * @param {string} [input.name=""] - Entry basename
     * @param {DocumentStat|object} [input.stat={}] - Stats object
     * @param {number} [input.depth=0] - Nesting level
     * @param {string} [input.path=""] - Full path (auto-derives name/parent if missing)
     * @param {string} [input.parent=""] - Parent path
     * @param {boolean | undefined} [input.fulfilled] - If entry is fully resolved
     */
    constructor(input?: {
        name?: string | undefined;
        stat?: DocumentStat | object;
        depth?: number | undefined;
        path?: string | undefined;
        parent?: string | undefined;
        fulfilled?: boolean | undefined;
    });
    /** @type {string} Basename of the entry */
    name: string;
    /** @type {DocumentStat} File/directory statistics */
    stat: DocumentStat;
    /** @type {number} Nesting depth in directory tree */
    depth: number;
    /** @type {string} Full path URI */
    path: string;
    /** @type {string} Parent directory path */
    parent: string;
    /** @type {boolean} If stat is complete/resolved */
    fulfilled: boolean;
    /**
     * Check if entry is a directory
     * Delegates to stat.isDirectory.
     * @returns {boolean}
     */
    get isDirectory(): boolean;
    /**
     * Check if entry is a file
     * Delegates to stat.isFile.
     * @returns {boolean}
     */
    get isFile(): boolean;
    /**
     * Check if entry is a symbolic link
     * Delegates to stat.isSymbolicLink.
     * @returns {boolean}
     */
    get isSymbolicLink(): boolean;
    /**
     * Get string representation of entry
     * Format: Type (D/F/L/?) + path/name.
     * @returns {string} e.g., "F file.txt"
     */
    toString(): string;
}
import DocumentStat from "./DocumentStat.js";
