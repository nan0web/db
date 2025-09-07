export default class FetchOptions {
	globals = true
	inherit = true
	refs = true
	defaultValue = undefined
	allowDirs = true
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
	 * @param {object} input
	 * @returns {FetchOptions}
	 */
	static from(input) {
		if (input instanceof FetchOptions) return input
		return new FetchOptions(input)
	}
}

