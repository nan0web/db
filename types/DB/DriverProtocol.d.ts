/**
 * @typedef {Object} DriverConfig
 * @property {string} [cwd="."] - Current working directory (base for absolute paths)
 * @property {string} [root="."] - Root path for URI resolution
 * @property {typeof Directory} [Directory=Directory] - Directory class with data functionality
 * @property {DBDriverProtocol} [driver] - Next driver if current fails, undefined by default
 */
/**
 * Base protocol for database drivers.
 * Defines the interface for storage backends (e.g., FS, HTTP, DB engines).
 * Optional: Implement ensureAuthorized for access control support.
 * Subclasses should override methods for specific behavior.
 *
 * @class
 */
export default class DBDriverProtocol {
    static Formats: {
        loaders: ((str: any, ext: any) => any)[];
        savers: ((doc: any, ext: any) => string | false)[];
    };
    /**
     * @param {any} input
     * @returns {DBDriverProtocol}
     */
    static from(input: any): DBDriverProtocol;
    /**
     * @param {DriverConfig} config
     */
    constructor(config?: DriverConfig);
    /** @type {string} */
    cwd: string;
    /** @type {string} */
    root: string;
    /** @type {typeof Directory} */
    Directory: typeof Directory;
    /** @type {DBDriverProtocol | undefined} */
    driver: DBDriverProtocol | undefined;
    /**
     * Connects to the physical environment
     * Initializes the driver (e.g., open connection, mount filesystem).
     * @param {object} [opts] - Connection options
     * @returns {Promise<boolean | void>} - TRUE on success, FALSE on failure, undefined if not realized.
     */
    connect(opts?: object): Promise<boolean | void>;
    /**
     * Disconnects from the physical environment
     * Cleans up resources (e.g., close connections).
     * @returns {Promise<boolean | void>} - TRUE on success, FALSE on failure, undefined if not realized.
     */
    disconnect(): Promise<boolean | void>;
    /**
     * Checks access to URI
     * Validates permissions before operations.
     * @param {string} absoluteURI
     * @param {'r'|'w'|'d'} level
     * @param {AuthContext} [context=new AuthContext()]
     * @returns {Promise<boolean | void>} - TRUE if allowed, FALSE if denied, undefined if not realized.
     */
    access(absoluteURI: string, level: 'r' | 'w' | 'd', context?: AuthContext | undefined): Promise<boolean | void>;
    /**
     * Loads a document
     * Reads content from storage.
     * @param {string} absoluteURI
     * @param {any} [defaultValue]
     * @returns {Promise<any>} - any on success, undefined on failure or if not realized.
     */
    read(absoluteURI: string, defaultValue?: any): Promise<any>;
    /**
     * Saves a document
     * Writes content to storage.
     * @param {string} absoluteURI
     * @param {any} document
     * @returns {Promise<boolean | void>} - TRUE on success, FALSE on failure, undefined if not realized.
     */
    write(absoluteURI: string, document: any): Promise<boolean | void>;
    /**
     * Appends a chunk to existing document or creates a new one with a chunk.
     * Supports streaming writes.
     * @param {string} absoluteURI
     * @param {string} chunk
     * @returns {Promise<boolean | void>} - TRUE on success, FALSE on failure, undefined if not realized.
     */
    append(absoluteURI: string, chunk: string): Promise<boolean | void>;
    /**
     * Gets statistics for a document
     * Returns metadata like size, mtime, type.
     * @param {string} absoluteURI
     * @returns {Promise<DocumentStat | void>} - Document stats on success or failure, undefined if not realized.
     */
    stat(absoluteURI: string): Promise<DocumentStat | void>;
    /**
     * Moves (renames) document.
     * @param {string} absoluteFrom
     * @param {string} absoluteTo
     * @returns {Promise<boolean | void>} - TRUE on success, FALSE on failure, undefined if not realized.
     */
    move(absoluteFrom: string, absoluteTo: string): Promise<boolean | void>;
    /**
     * Deletes the document.
     * @param {string} absoluteURI - Resource URI
     * @returns {Promise<boolean | void>} - TRUE on success, FALSE on failure, undefined if not realized.
     */
    delete(absoluteURI: string): Promise<boolean | void>;
    /**
     * Lists directory contents if ends with / its directory, otherwise file.
     * @example
     * await driver.listDir("/etc/") // ← ["apache2/", "hosts", "passwd"]
     * @param {string} absoluteURI - Directory URI
     * @returns {Promise<string[]>}
     */
    listDir(absoluteURI: string): Promise<string[]>;
}
export type DriverConfig = {
    /**
     * - Current working directory (base for absolute paths)
     */
    cwd?: string | undefined;
    /**
     * - Root path for URI resolution
     */
    root?: string | undefined;
    /**
     * - Directory class with data functionality
     */
    Directory?: typeof Directory | undefined;
    /**
     * - Next driver if current fails, undefined by default
     */
    driver?: DBDriverProtocol | undefined;
};
import Directory from "../Directory.js";
import AuthContext from "./AuthContext.js";
import DocumentStat from "../DocumentStat.js";
