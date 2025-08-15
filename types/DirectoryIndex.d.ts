export default DirectoryIndex;
declare class DirectoryIndex {
    static ENTRIES_AS_ARRAY: string;
    static ENTRIES_AS_OBJECT: string;
    static ENTRIES_AS_ROWS: string;
    static ENTRIES_AS_TEXT: string;
    /**
     * Creates DirectoryIndex instance from input
     * @param {object|DirectoryIndex} input - Properties or existing instance
     * @returns {DirectoryIndex}
     */
    static from(input: object | DirectoryIndex): DirectoryIndex;
    /**
     * When entriesColumns fulfilled — indexes are stored as string[][] in data files
     * instead of Record<string, object>
     * @param {object} input
     * @param {string[]} [input.entriesColumns=[]]
     * @param {Array<Array<string, DocumentStat>> | string[][] | string[] | string} [input.entries=[]]
     * @param {string} [input.entriesAs]
     * @param {number} [input.maxEntriesOnLoad=12]
     * @param {object} [input.filter]
     */
    constructor(input?: {
        entriesColumns?: string[] | undefined;
        entries?: string | string[] | string[][] | undefined;
        entriesAs?: string | undefined;
        maxEntriesOnLoad?: number | undefined;
        filter?: object;
    });
    /** @type {string[]} */
    entriesColumns: string[];
    /** @type {string} */
    entriesAs: string;
    /** @type {Array<Array<string, DocumentStat>> | string[][] | string[] | string} */
    entries: Array<Array<string, DocumentStat>> | string[][] | string[] | string;
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
     * @param {Array<[string, DocumentStat]>} entries - Entries to encode
     * @param {string} target - Target encoding format
     * @returns {string[][] | string[] | string | Array<[string, DocumentStat]>} Encoded entries
     */
    encode(entries: Array<[string, DocumentStat]>, target?: string): string[][] | string[] | string | Array<[string, DocumentStat]>;
    /**
     * Decodes entries from stored format back to [name, DocumentStat] pairs
     * @param {any} source - Source data to decode
     * @param {string} target - Target decoding format
     * @returns {Array<[string, DocumentStat]>} Decoded entries
     */
    decode(source: any, target?: string): Array<[string, DocumentStat]>;
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
