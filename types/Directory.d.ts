/**
 * Directory class handles directory-related operations and configurations.
 * Provides static utilities for identifying directories, globals, and indexes.
 * Used by DB for path classification and global variable scoping.
 *
 * Key constants:
 * - `FILE = "_"` - Default inheritance/settings file per directory
 * - `GLOBALS = "_/"` - Prefix for global variables (scoped to _/ subdir)
 * - `INDEX = "index"` - Default index file for directory listings
 * - `DATA_EXTNAMES` - Supported extensions for data files
 *
 * Usage:
 * ```js
 * Directory.isGlobal('en/_/langs.json'); // true
 * Directory.getGlobalName('en/_/langs.json'); // 'langs'
 * Directory.isDirectory('folder/'); // true
 * ```
 *
 * @class Directory
 */
export default class Directory {
    /**
     * The default file name for directory settings.
     * Used for inheritance (e.g., _.json in each dir).
     * @type {string}
     */
    static FILE: string;
    /**
     * The path prefix for global variables available to all nested documents.
     * Globals are loaded from _/ subdirectories up the hierarchy.
     * @type {string}
     */
    static GLOBALS: string;
    /**
     * The default index name for directories.
     * Used for listing immediate children (e.g., index.txt).
     * @type {string}
     */
    static INDEX: string;
    /**
     * Supported data file extensions for loading documents.
     * Determines if a file is treated as structured data.
     * @type {string[]}
     */
    static DATA_EXTNAMES: string[];
    /**
     * Checks if a given path is a global variable path.
     * Global paths start with the GLOBALS prefix or contain /_/.
     * @param {string} path - Path to check.
     * @returns {boolean} True if the path is a global variable path.
     */
    static isGlobal(path: string): boolean;
    /**
     * Checks if a path represents the root directory.
     * Roots are ".", "/", "./", or empty string.
     * @param {string} path - Path to check.
     * @returns {boolean} True if root.
     */
    static isRoot(path: string): boolean;
    /**
     * Returns Global variable name or empty string if incorrect global path.
     * Strips extension from basename if it's a data extension.
     * @param {string} path
     * @returns {string}
     */
    static getGlobalName(path: string): string;
    /**
     * Checks if a given path represents a directory.
     * Directory paths end with a forward slash (/).
     * @param {string} path - Path to check.
     * @returns {boolean} True if the path is a directory.
     */
    static isDirectory(path: string): boolean;
    /**
     * Gets the list of directory entries.
     * Base implementation returns empty array (override in subclasses).
     * @returns {Array} An empty array representing the directory entries.
     */
    get entries(): any[];
    /**
     * Gets a function that returns directory entries.
     * Base implementation returns empty array function (override in subclasses).
     * @returns {Function} A function that returns an empty array.
     */
    get entriesFn(): Function;
}
