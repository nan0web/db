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
	/** @type {any[]} */
	#fails = []

	/**
	 * @param {object} [input={}] - Context data
	 * @param {string} [input.username=''] - Username
	 * @param {string} [input.role='guest'] - Primary role
	 * @param {string[]} [input.roles=[]] - Array of roles
	 * @param {any} [input.user=null] - Full user object
	 * @param {any[]} [input.fails=[]] - Stored errors of fail access.
	 */
	constructor(input = {}) {
		const known = {
			username: '',
			role: 'guest',
			roles: [],
			user: null,
			fails: [],
		}
		const {
			username = known.username,
			role = known.role,
			roles = known.roles,
			user = known.user,
			fails = known.fails,
		} = input
		this.username = String(username)
		this.role = String(role)
		this.roles = Array.isArray(roles) ? [...roles] : []
		this.user = user
		this.#fails = fails
		// Copy unknown properties
		for (let k in input) {
			if (!['username', 'role', 'roles', 'user'].includes(k)) {
				this[k] = input[k]
			}
		}
	}

	/** @returns {any[]} */
	get fails() {
		return this.#fails
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
	 * Adds a fail error message.
	 * @param {any} err
	 */
	fail(err) {
		this.#fails.push(err)
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
