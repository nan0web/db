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
    static UI: {
        title: string;
        description: string;
        icon: string;
    };
    static sha: {
        help: string;
        type: string;
        required: boolean;
        default: string;
    };
    static key: {
        help: string;
        type: string;
        required: boolean;
        default: string;
    };
    static author: {
        help: string;
        type: string;
        default: string;
    };
    static message: {
        help: string;
        type: string;
        default: string;
    };
    static timestamp: {
        help: string;
        type: string;
        default: string;
    };
    static size: {
        help: string;
        type: string;
        default: number;
        hidden: boolean;
    };
    /**
     * @param {Partial<RevisionInfo>} [data]
     * @param {object} [options]
     */
    constructor(data?: Partial<RevisionInfo>, options?: object);
    /** @type {string} Hash of the revision */ sha: string;
    /** @type {string} Document key this revision belongs to */ key: string;
    /** @type {string} Author of the change (empty if anonymous/wiki) */ author: string;
    /** @type {string} Commit or change description */ message: string;
    /** @type {string} ISO 8601 timestamp of the revision */ timestamp: string;
    /** @type {number} Document size in bytes at this revision */ size: number;
    /**
     * @returns {Date | null}
     */
    get date(): Date | null;
    /**
     * Short sha (first 7 characters) — git convention.
     * @returns {string}
     */
    get shortSha(): string;
}
import { Model } from '@nan0web/types';
