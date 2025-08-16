export default Directory;
/**
 * Directory class handles directory-related operations and configurations.
 *
 * @class Directory
 *
 * @property {string} FILE - The default file name for directory settings.
 * @property {string} GLOBALS - The path for global scoped variables.
 * @property {string} INDEX - The default index name for directories.
 * @property {string[]} DATA_EXTNAMES - List of supported data file extensions.
 */
declare class Directory {
    /**
     * The default file name for directory settings.
     * @type {string}
     */
    static FILE: string;
    /**
     * The path prefix for global variables available to all nested documents.
     * @type {string}
     */
    static GLOBALS: string;
    /**
     * The default index name for directories.
     * @type {string}
     */
    static INDEX: string;
    /**
     * Supported data file extensions for loading documents.
     * @type {string[]}
     */
    static DATA_EXTNAMES: string[];
    /**
     * Gets the list of directory entries.
     * @returns {Array} An empty array representing the directory entries.
     */
    get entries(): any[];
    /**
     * Gets a function that returns directory entries.
     * @returns {Function} A function that returns an empty array.
     */
    get entriesFn(): Function;
    /**
     * Gets the filter instance used for directory entries.
     * @returns {Filter} A new Filter instance.
     */
    get filter(): typeof Filter;
}
/**
 * Filter class used for filtering directory entries.
 */
declare function Filter(): void;
