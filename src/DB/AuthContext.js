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
	/** @type {string} */
	username = ''
	/** @type {string} */
	role = 'guest'
	/** @type {string[]} */
	roles = []
	/** @type {any} */
	user = null

	/**
	 * @param {object} [input={}] - Context data
	 * @param {string} [input.username=''] - Username
	 * @param {string} [input.role='guest'] - Primary role
	 * @param {string[]} [input.roles=[]] - Array of roles
	 * @param {any} [input.user=null] - Full user object
	 */
	constructor(input = {}) {
		const {
			username = this.username,
			role = this.role,
			roles = this.roles,
			user = this.user,
		} = input
		this.username = String(username)
		this.role = String(role)
		this.roles = Array.isArray(roles) ? [...roles] : []
		this.user = user
	}

	/**
	 * Checks if the context has a specific role.
	 * @param {string} role - Role to check
	 * @returns {boolean}
	 */
	hasRole(role) {
		return this.roles.includes(role) || this.role === role
	}

	/**
	 * Creates AuthContext from input.
	 * @param {AuthContext | object} input - Existing instance or plain object
	 * @returns {AuthContext}
	 */
	static from(input) {
		if (input instanceof AuthContext) return input
		return new AuthContext(input)
	}
}