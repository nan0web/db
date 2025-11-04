import DocumentStat from "../DocumentStat.js"
import AuthContext from "./AuthContext.js"

/**
 * Base protocol for database drivers.
 * Defines the interface for storage backends (e.g., FS, HTTP, DB engines).
 * Optional: Implement ensureAuthorized for access control support.
 * Subclasses should override methods for specific behavior.
 *
 * @class
 */
export default class DBDriverProtocol {
	/**
	 * Connects to the physical environment
	 * Initializes the driver (e.g., open connection, mount filesystem).
	 * @param {object} [opts] - Connection options
	 * @returns {Promise<void>}
	 */
	async connect(opts) { }

	/**
	 * Disconnects from the physical environment
	 * Cleans up resources (e.g., close connections).
	 * @returns {Promise<void>}
	 */
	async disconnect() { }

	/**
	 * Checks access to URI
	 * Validates permissions before operations.
	 * @param {string} uri
	 * @param {'r'|'w'|'d'} level
	 * @returns {Promise<void>}
	 */
	async access(uri, level) { }

	/**
	 * Loads a document
	 * Reads content from storage.
	 * @param {string} uri
	 * @param {any} [defaultValue]
	 * @returns {Promise<any>}
	 */
	async read(uri, defaultValue) { }

	/**
	 * Saves a document
	 * Writes content to storage.
	 * @param {string} uri
	 * @param {any} document
	 * @returns {Promise<void>}
	 */
	async write(uri, document) { }

	/**
	 * Appends a chunk to existing document or creates a new one with a chunk.
	 * Supports streaming writes.
	 * @param {string} uri
	 * @param {string} chunk
	 * @returns {Promise<void>}
	 */
	async append(uri, chunk) { }

	/**
	 * Gets statistics for a document
	 * Returns metadata like size, mtime, type.
	 * @param {string} uri
	 * @returns {Promise<DocumentStat>}
	 */
	async stat(uri) {
		return new DocumentStat()
	}

	/**
	 * Ensures access to URI.
	 * Performs authorization check based on level and context.
	 * @param {string} uri - Resource URI
	 * @param {'r'|'w'|'d'} level - Access level
	 * @param {AuthContext} context - Auth context: { username, role, roles, user }
	 * @returns {Promise<{ granted: boolean }>}
	 * @throws {Error} - Access denied
	 */
	async ensure(uri, level, context) {
		// Default: open access
		return { granted: true }
	}
}