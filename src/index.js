/**
 * Main export module for @nan0web/db.
 * Re-exports core classes, utilities, and types.
 * Default export is the DB class for easy instantiation.
 *
 * Core components:
 * - DB: Main database class
 * - Data: Object manipulation utilities
 * - Directory/Index: Directory handling
 * - DocumentEntry/Stat: File metadata
 * - StreamEntry: Progress during traversal
 *
 * Usage:
 * ```js
 * import DB, { Data, DocumentStat } from '@nan0web/db';
 * ```
 *
 * @module
 */
import DB, { AuthContext, DBDriverProtocol, GetOptions, FetchOptions } from './DB/index.js'
import Directory from './Directory.js'
import DirectoryIndex from './DirectoryIndex.js'
import DocumentEntry from './DocumentEntry.js'
import DocumentStat from './DocumentStat.js'
import StreamEntry from './StreamEntry.js'
import Data from './Data.js'
export {
	Directory,
	DirectoryIndex,
	DocumentEntry,
	DocumentStat,
	StreamEntry,
	Data,
	DB,
	DBDriverProtocol,
	GetOptions,
	FetchOptions,
	AuthContext,
}
export * from './DB/path.js'
export default DB
