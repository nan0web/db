export default DocumentEntry;
/**
 * Represents a document entry in the filesystem
 * @class
 */
declare class DocumentEntry {
    /**
     * Creates a DocumentEntry from input
     * @param {object|DocumentEntry} input
     * @returns {DocumentEntry}
     */
    static from(input: object | DocumentEntry): DocumentEntry;
    /**
     * Creates a new DocumentEntry instance
     * @param {object} input
     * @param {string} [input.name=""]
     * @param {DocumentStat|object} [input.stat={}]
     * @param {number} [input.depth=0]
     * @param {string} [input.path=""]
     * @param {string} [input.parent=""]
     * @param {boolean | undefined} [input.fulfilled]
     */
    constructor(input?: {
        name?: string | undefined;
        stat?: DocumentStat | object;
        depth?: number | undefined;
        path?: string | undefined;
        parent?: string | undefined;
        fulfilled?: boolean | undefined;
    });
    /** @type {string} */
    name: string;
    /** @type {DocumentStat} */
    stat: DocumentStat;
    /** @type {number} */
    depth: number;
    /** @type {string} */
    path: string;
    /** @type {string} */
    parent: string;
    /** @type {boolean} */
    fulfilled: boolean;
    /**
     * Check if entry is a directory
     * @returns {boolean}
     */
    get isDirectory(): boolean;
    /**
     * Check if entry is a file
     * @returns {boolean}
     */
    get isFile(): boolean;
    /**
     * Check if entry is a symbolic link
     * @returns {boolean}
     */
    get isSymbolicLink(): boolean;
    /**
     * Get string representation of entry
     * @returns {string}
     */
    toString(): string;
}
import DocumentStat from "./DocumentStat.js";
