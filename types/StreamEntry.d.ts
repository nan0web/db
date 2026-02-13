export default StreamEntry;
/**
 * Represents a stream entry with progress information
 * Aggregates file lists, directories, errors, and stats during directory traversal.
 * Used in findStream for real-time progress in large scans.
 *
 * Tracks:
 * - Current file
 * - Cumulative files (sorted)
 * - Dirs and top-level entries
 * - Errors encountered
 * - Progress percentage and total sizes
 *
 * Usage:
 * ```js
 * for await (const entry of db.findStream('.')) {
 *   console.log(entry.progress, entry.totalSize);
 * }
 * ```
 *
 * @class
 */
declare class StreamEntry {
    /**
     * Creates a new StreamEntry instance
     * Converts inputs to proper types (e.g., DocumentEntry).
     * @param {object} input
     * @param {DocumentEntry|object} [input.file={}] - Current entry
     * @param {DocumentEntry[]|object[]} [input.files=[]] - File list
     * @param {Map<string, DocumentEntry>} [input.dirs=new Map()] - Dirs
     * @param {Map<string, DocumentEntry>} [input.top=new Map()] - Top entries
     * @param {Map<string, Error | null>} [input.errors=new Map()] - Errors
     * @param {number} [input.progress=0] - Progress fraction
     * @param {{ dirs: number, files: number }} [input.totalSize={ dirs: 0, files: 0 }] - Sizes
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
    /** @type {DocumentEntry} Current file being processed */
    file: DocumentEntry;
    /** @type {DocumentEntry[]} All files found so far (sorted) */
    files: DocumentEntry[];
    /** @type {Map<string, DocumentEntry>} Directories encountered */
    dirs: Map<string, DocumentEntry>;
    /** @type {Map<string, DocumentEntry>} Top-level (immediate) entries */
    top: Map<string, DocumentEntry>;
    /** @type {Map<string, Error | null>} Errors during traversal */
    errors: Map<string, Error | null>;
    /** @type {number} Progress (0-1) */
    progress: number;
    /** @type {{ dirs: number, files: number }} Cumulative sizes */
    totalSize: {
        dirs: number;
        files: number;
    };
}
import DocumentEntry from './DocumentEntry.js';
