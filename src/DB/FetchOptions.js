/**
 * Options for the `fetch` and `fetchMerged` methods.
 * Controls inheritance, globals, references, and directory handling.
 *
 * Usage:
 * ```js
 * const opts = new FetchOptions({ inherit: false, refs: true });
 * const data = await db.fetch('doc.json', opts);
 * ```
 *
 * @class
 */
export default class FetchOptions {
	/** @type {boolean} Whether to load global variables */
	globals = true
	/** @type {boolean} Whether to apply inheritance from parent directories */
	inherit = true
	/** @type {boolean} Whether to resolve $ref references */
	refs = true
	/** @type {any} Fallback value if document not found */
	defaultValue = undefined
	/** @type {boolean} Whether to treat URI as directory if no file found */
	allowDirs = true
	/**
	 * @param {object} input
	 * @param {boolean} [input.globals=true]
	 * @param {boolean} [input.inherit=true]
	 * @param {boolean} [input.refs=true]
	 * @param {any} [input.defaultValue=undefined]
	 * @param {boolean} [input.allowDirs=true]
	 */
	constructor(input = {}) {
		const {
			globals = true,
			inherit = true,
			refs = true,
			defaultValue = undefined,
			allowDirs = true,
		} = input
		this.globals = Boolean(globals)
		this.inherit = Boolean(inherit)
		this.refs = Boolean(refs)
		this.defaultValue = defaultValue
		this.allowDirs = Boolean(allowDirs)
	}
	/**
	 * Factory method to create FetchOptions from input.
	 * @param {object | FetchOptions} input
	 * @returns {FetchOptions}
	 */
	static from(input) {
		if (input instanceof FetchOptions) return input
		return new FetchOptions(input)
	}
}