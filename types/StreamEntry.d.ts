export default StreamEntry;
/**
 * Represents a stream entry with progress information
 * @class
 */
declare class StreamEntry {
    /**
     * Creates a new StreamEntry instance
     * @param {object} input
     * @param {DocumentEntry|object} [input.file={}]
     * @param {DocumentEntry[]|object[]} [input.files=[]]
     * @param {Map<string, DocumentEntry>} [input.dirs=new Map()]
     * @param {Map<string, DocumentEntry>} [input.top=new Map()]
     * @param {Map<string, Error | null>} [input.errors=new Map()]
     * @param {number} [input.progress=0]
     * @param {{ dirs: number, files: number }} [input.totalSize={ dirs: 0, files: 0 }]
     */
    constructor(input?: {
        file?: DocumentEntry | object;
        files?: any[] | DocumentEntry[] | undefined;
        dirs?: Map<string, DocumentEntry> | undefined;
        top?: Map<string, DocumentEntry> | undefined;
        errors?: Map<string, Error | null> | undefined;
        progress?: number | undefined;
        totalSize?: {
            dirs: number;
            files: number;
        } | undefined;
    });
    /** @type {DocumentEntry} */
    file: DocumentEntry;
    /** @type {DocumentEntry[]} */
    files: DocumentEntry[];
    /** @type {Map<string, DocumentEntry>} */
    dirs: Map<string, DocumentEntry>;
    /** @type {Map<string, DocumentEntry>} */
    top: Map<string, DocumentEntry>;
    /** @type {Map<string, Error | null>} */
    errors: Map<string, Error | null>;
    /** @type {number} */
    progress: number;
    /** @type {{ dirs: number, files: number }} */
    totalSize: {
        dirs: number;
        files: number;
    };
}
import DocumentEntry from "./DocumentEntry.js";
