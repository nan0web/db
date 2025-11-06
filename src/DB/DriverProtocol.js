import DocumentStat from "../DocumentStat.js"
import AuthContext from "./AuthContext.js"

/**
 * @typedef {Object} DriverConfig
 * @property {string} [cwd="."] - Current working directory (base for absolute paths)
 * @property {string} [root="."] - Root path for URI resolution
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
	/** @type {string} */
	cwd = "."
	/** @type {string} */
	root = "."
	/** @type {DBDriverProtocol | undefined} */
	driver
	/**
	 * @param {DriverConfig} config
	 */
	constructor(config = {}) {
		const {
			cwd = this.cwd,
			root = this.root,
			driver,
		} = config
		this.cwd = String(cwd)
		this.root = String(root)
		this.driver = driver ? driver : undefined
	}
	/**
	 * Connects to the physical environment
	 * Initializes the driver (e.g., open connection, mount filesystem).
	 * @param {object} [opts] - Connection options
	 * @returns {Promise<boolean | void>} - TRUE on success, FALSE on failure, undefined if not realized.
	 */
	async connect(opts) {
		if (this.driver) {
			return await this.driver.connect(opts)
		}
	}

	/**
	 * Disconnects from the physical environment
	 * Cleans up resources (e.g., close connections).
	 * @returns {Promise<boolean | void>} - TRUE on success, FALSE on failure, undefined if not realized.
	 */
	async disconnect() {
		if (this.driver) {
			return await this.driver.disconnect()
		}
	}

	/**
	 * Checks access to URI
	 * Validates permissions before operations.
	 * @param {string} absoluteURI
	 * @param {'r'|'w'|'d'} level
	 * @param {AuthContext} [context=new AuthContext()]
	 * @returns {Promise<boolean | void>} - TRUE if allowed, FALSE if denied, undefined if not realized.
	 */
	async access(absoluteURI, level, context = new AuthContext()) {
		return undefined
	}

	/**
	 * Loads a document
	 * Reads content from storage.
	 * @param {string} absoluteURI
	 * @param {any} [defaultValue]
	 * @returns {Promise<any>} - any on success, undefined on failure or if not realized.
	 */
	async read(absoluteURI, defaultValue) {
		if (this.driver) {
			return await this.driver.read(absoluteURI, defaultValue)
		}
		return undefined
	}

	/**
	 * Saves a document
	 * Writes content to storage.
	 * @param {string} absoluteURI
	 * @param {any} document
	 * @returns {Promise<boolean | void>} - TRUE on success, FALSE on failure, undefined if not realized.
	 */
	async write(absoluteURI, document) {
		if (this.driver) {
			return await this.driver.write(absoluteURI, document)
		}
	}

	/**
	 * Appends a chunk to existing document or creates a new one with a chunk.
	 * Supports streaming writes.
	 * @param {string} absoluteURI
	 * @param {string} chunk
	 * @returns {Promise<boolean | void>} - TRUE on success, FALSE on failure, undefined if not realized.
	 */
	async append(absoluteURI, chunk) {
		if (this.driver) {
			return await this.driver.append(absoluteURI, chunk)
		}
	}

	/**
	 * Gets statistics for a document
	 * Returns metadata like size, mtime, type.
	 * @param {string} absoluteURI
	 * @returns {Promise<DocumentStat | void>} - Document stats on success or failure, undefined if not realized.
	 */
	async stat(absoluteURI) {
		if (this.driver) {
			return await this.driver.stat(absoluteURI)
		}
	}

	/**
	 * Moves (renames) document.
	 * @param {string} absoluteFrom
	 * @param {string} absoluteTo
	 * @returns {Promise<boolean | void>} - TRUE on success, FALSE on failure, undefined if not realized.
	 */
	async move(absoluteFrom, absoluteTo) {
		if (this.driver) {
			return await this.driver.move(absoluteFrom, absoluteTo)
		}
	}

	/**
	 * Deletes the document.
	 * @param {string} absoluteURI - Resource URI
	 * @returns {Promise<boolean | undefined>} - TRUE on success, FALSE on failure, undefined if not realized.
	 */
	async delete(absoluteURI) {
		if (this.driver) {
			return await this.driver.delete(absoluteURI)
		}
	}

	/**
	 * Lists directory contents if ends with / its directory, otherwise file.
	 * @example
	 * await driver.listDir("/etc/") // ← ["apache2/", "hosts", "passwd"]
	 * @param {string} absoluteURI - Directory URI
	 * @returns {Promise<string[]>}
	 */
	async listDir(absoluteURI) {
		return []
	}

	/**
	 * @param {any} input
	 * @returns {DBDriverProtocol}
	 */
	static from(input) {
		if (input instanceof DBDriverProtocol) return input
		return new DBDriverProtocol(input)
	}
}
