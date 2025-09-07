export default class GetOptions {
	defaultValue = undefined
	constructor(input = {}) {
		const {
			defaultValue = this.defaultValue,
		} = input
		this.defaultValue = defaultValue
	}
	/**
	 * @param {object} input
	 * @returns {GetOptions}
	 */
	static from(input) {
		if (input instanceof GetOptions) return input
		return new GetOptions(input)
	}
}
