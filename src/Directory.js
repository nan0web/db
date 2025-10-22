/**
 * Directory class handles directory-related operations and configurations.
 *
 * @class Directory
 *
 * @property {string} FILE - The default file name for directory settings.
 * @property {string} GLOBALS - The path prefix for global scoped variables.
 * @property {string} INDEX - The default index name for directories.
 * @property {string[]} DATA_EXTNAMES - List of supported data file extensions.
 */
class Directory {
	/**
	 * The default file name for directory settings.
	 * @type {string}
	 */
	static FILE = "_"

	/**
	 * The path prefix for global variables available to all nested documents.
	 * @type {string}
	 */
	static GLOBALS = "_/"

	/**
	 * The default index name for directories.
	 * @type {string}
	 */
	static INDEX = "index"

	/**
	 * Supported data file extensions for loading documents.
	 * @type {string[]}
	 */
	static DATA_EXTNAMES = [".json", ".yaml", ".yml", ".nano", ".csv", ".md"]

	/**
	 * Checks if a given path is a global variable path.
	 * Global paths start with the GLOBALS prefix.
	 *
	 * @param {string} path - Path to check.
	 * @returns {boolean} True if the path is a global variable path.
	 */
	static isGlobal(path) {
		const str = String(path)
		return str.startsWith(this.GLOBALS) || str.includes(`/${this.GLOBALS}`)
	}

	static isRoot(path) {
		return [".", "/", "./", ""].includes(path)
	}

	/**
	 * Returns Global variable name or empty string if incorrect global path.
	 * @param {string} path
	 * @returns {string}
	 */
	static getGlobalName(path) {
		if (!this.isGlobal(path)) return ""
		const base = String(path).split("/").pop()
		if (!base) return ""
		const arr = base.split(".")
		if (arr.length > 1) {
			const ext = "." + arr.pop()
			if (this.DATA_EXTNAMES.includes(ext)) {
				return arr.join(".")
			}
			return ""
		}
		return arr[0]
	}

	/**
	 * Checks if a given path represents a directory.
	 * Directory paths end with a forward slash (/).
	 *
	 * @param {string} path - Path to check.
	 * @returns {boolean} True if the path is a directory.
	 */
	static isDirectory(path) {
		return String(path).endsWith("/")
	}

	/**
	 * Gets the list of directory entries.
	 * @returns {Array} An empty array representing the directory entries.
	 */
	get entries() {
		return []
	}

	/**
	 * Gets a function that returns directory entries.
	 * @returns {Function} A function that returns an empty array.
	 */
	get entriesFn() {
		return (() => [])
	}
}

export default Directory