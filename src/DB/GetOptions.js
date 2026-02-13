/**
 * Options for the `get` method.
 * Primarily controls fallback for missing documents.
 *
 * Usage:
 * ```js
 * const opts = new GetOptions({ defaultValue: 'fallback' });
 * const data = await db.get('missing.json', opts);
 * ```
 *
 * @class
 */
export default class GetOptions {
	/** @type {any} Fallback value if document not found */
	defaultValue = undefined
	/**
	 * @param {object} input
	 * @param {any} [input.defaultValue=undefined]
	 */
	constructor(input = {}) {
		const { defaultValue = this.defaultValue } = input
		this.defaultValue = defaultValue
	}
	/**
	 * Factory method to create GetOptions from input.
	 * @param {object | GetOptions} input
	 * @returns {GetOptions}
	 */
	static from(input) {
		if (input instanceof GetOptions) return input
		return new GetOptions(input)
	}
}
