import { Model } from '@nan0web/types'

/**
 * RevisionInfo — Model-as-Schema for document version history entry.
 *
 * Abstracts the concept of a revision/changeset regardless of
 * the underlying DB adapter implementation:
 *   - db-fs:      backed by git commits (sha = git hash)
 *   - db-redis:   stored as separate keys with TTL (sha = redis key suffix)
 *   - db-browser: maintained in IndexedDB journal (sha = auto-increment ID)
 *
 * Used by the abstract contract `db.history(key)` which every
 * DB adapter must implement.
 *
 * See user-stories.md (lines 32-33)
 *
 * @property {string} sha Unique revision identifier (adapter-specific)
 * @property {string} key Document key this revision belongs to
 * @property {string} author Author of the change (empty if anonymous)
 * @property {string} message Commit/change message
 * @property {string} timestamp ISO 8601 timestamp of the revision
 * @property {number} size Document size in bytes at this revision
 */
export default class RevisionInfo extends Model {
	static UI = {
		title: 'Revision',
		description: 'Document version history entry',
		icon: '📝',
	}

	static sha = {
		help: 'Unique revision identifier (git hash, redis key, IndexedDB ID)',
		type: 'string',
		required: true,
		default: '',
	}

	static key = {
		help: 'Document key this revision belongs to',
		type: 'string',
		required: true,
		default: '',
	}

	static author = {
		help: 'Author of the change (empty if anonymous/wiki)',
		type: 'string',
		default: '',
	}

	static message = {
		help: 'Commit or change description',
		type: 'string',
		default: '',
	}

	static timestamp = {
		help: 'ISO 8601 timestamp of the revision',
		type: 'string',
		default: '',
	}

	static size = {
		help: 'Document size in bytes at this revision',
		type: 'number',
		default: 0,
		hidden: true,
	}

	/**
	 * @param {Partial<RevisionInfo>} [data]
	 * @param {object} [options]
	 */
	constructor(data = {}, options = {}) {
		super(data, options)

		/** @type {string} Hash of the revision */ this.sha
		/** @type {string} Document key this revision belongs to */ this.key
		/** @type {string} Author of the change (empty if anonymous/wiki) */ this.author
		/** @type {string} Commit or change description */ this.message
		/** @type {string} ISO 8601 timestamp of the revision */ this.timestamp
		/** @type {number} Document size in bytes at this revision */ this.size
	}

	/**
	 * @returns {Date | null}
	 */
	get date() {
		if (!this.timestamp) return null
		return new Date(this.timestamp)
	}

	/**
	 * Short sha (first 7 characters) — git convention.
	 * @returns {string}
	 */
	get shortSha() {
		return this.sha ? this.sha.slice(0, 7) : ''
	}
}
