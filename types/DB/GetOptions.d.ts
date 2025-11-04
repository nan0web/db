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
    /**
     * Factory method to create GetOptions from input.
     * @param {object | GetOptions} input
     * @returns {GetOptions}
     */
    static from(input: object | GetOptions): GetOptions;
    /**
     * @param {object} input
     * @param {any} [input.defaultValue=undefined]
     */
    constructor(input?: {
        defaultValue?: any;
    });
    /** @type {any} Fallback value if document not found */
    defaultValue: any;
}
