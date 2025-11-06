/**
 * Authentication context class for DB operations.
 * Provides structured information about the current user, roles, and permissions.
 * Can be passed to DB methods for access control checks.
 *
 * Usage:
 * ```js
 * const ctx = new AuthContext({ username: 'john', role: 'user', roles: ['user'] });
 * await db.get('/users/profile', ctx);
 * ```
 * @class
 */
export default class AuthContext {
    /**
     * Creates AuthContext from input.
     * @param {AuthContext | object} input - Existing instance or plain object
     * @returns {AuthContext}
     */
    static from(input: AuthContext | object): AuthContext;
    /**
     * @param {object} [input={}] - Context data
     * @param {string} [input.username=''] - Username
     * @param {string} [input.role='guest'] - Primary role
     * @param {string[]} [input.roles=[]] - Array of roles
     * @param {any} [input.user=null] - Full user object
     * @param {any[]} [input.fails=[]] - Stored errors of fail access.
     */
    constructor(input?: {
        username?: string | undefined;
        role?: string | undefined;
        roles?: string[] | undefined;
        user?: any;
        fails?: any[] | undefined;
    } | undefined);
    /** @type {string} */
    username: string;
    /** @type {string} */
    role: string;
    /** @type {string[]} */
    roles: string[];
    /** @type {any} */
    user: any;
    /** @returns {any[]} */
    get fails(): any[];
    /**
     * Checks if the context has a specific role.
     * @param {string} role - Role to check
     * @returns {boolean}
     */
    hasRole(role: string): boolean;
    /**
     * Adds a fail error message.
     * @param {any} err
     */
    fail(err: any): void;
    #private;
}
