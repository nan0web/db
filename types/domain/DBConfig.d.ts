/**
 * @typedef {'fs'|'redis'|'http'|'memory'} DBProtocolName
 */
/**
 * DBConfig — Model-as-Schema for database connection configuration.
 *
 * Describes the connection parameters for a database adapter.
 * Embedded within NaN0WebConfig as nested model.
 *
 * Supported protocols (via DBConfig.protocol):
 *   - 'fs'    → @nan0web/db-fs (default, file system)
 *   - 'redis' → @nan0web/db-redis
 *   - 'http'  → @nan0web/db-browser (remote REST)
 *
 * See user-stories.md (lines 18-20)
 *
 * @property {string} url Connection URL or directory path
 * @property {DBProtocolName} protocol Database adapter type
 * @property {string} username Authentication username
 * @property {string} password Authentication password (sensitive)
 * @property {string} database Logical database name or namespace
 * @property {number} maxRetries Maximum reconnection attempts
 * @property {number} timeoutMs Connection timeout in milliseconds
 */
export default class DBConfig extends Model {
    static UI: {
        title: string;
        description: string;
        icon: string;
    };
    static url: {
        alias: string;
        help: string;
        placeholder: string;
        type: string;
        default: string;
        required: boolean;
        validate: (v: any) => true | "error_db_url_required";
    };
    static protocol: {
        help: string;
        type: string;
        options: string[];
        default: string;
    };
    static username: {
        help: string;
        type: string;
        default: string;
        hidden: boolean;
    };
    static password: {
        help: string;
        type: string;
        default: string;
        hidden: boolean;
    };
    static database: {
        help: string;
        placeholder: string;
        type: string;
        default: string;
    };
    static maxRetries: {
        help: string;
        type: string;
        default: number;
    };
    static timeoutMs: {
        help: string;
        type: string;
        default: number;
    };
    /**
     * Detect protocol from URL string.
     * @param {string} url
     * @returns {'fs'|'redis'|'http'|'memory'}
     */
    static detectProtocol(url: string): "fs" | "redis" | "http" | "memory";
    /**
     * Parses DSN string into its components.
     * @param {string} dsn
     * @returns {Partial<DBConfig>}
     */
    static parseDsn(dsn: string): Partial<DBConfig>;
    /**
     * @param {Partial<DBConfig> | string | Record<string, any>} [data={}]
     * @param {Partial<import('@nan0web/types').ModelOptions>} [options={}]
     */
    constructor(data?: Partial<DBConfig> | string | Record<string, any>, options?: Partial<import("@nan0web/types").ModelOptions>);
    /** @type {string} Connection URL or directory path */ url: string;
    /** @type {DBProtocolName} Database adapter type */ protocol: DBProtocolName;
    /** @type {string} Authentication username (if required by adapter) */ username: string;
    /** @type {string} Authentication password (sensitive — never logged) */ password: string;
    /** @type {string} Logical database name or namespace */ database: string;
    /** @type {number} Maximum reconnection attempts before failure */ maxRetries: number;
    /** @type {number} Connection timeout in milliseconds */ timeoutMs: number;
    /**
     * Build a sanitized DSN string (without credentials).
     * Safe for logging and diagnostics.
     * @returns {string}
     */
    get safeDsn(): string;
}
export type DBProtocolName = "fs" | "redis" | "http" | "memory";
import { Model } from '@nan0web/types';
