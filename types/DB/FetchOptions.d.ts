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
    /**
     * Factory method to create FetchOptions from input.
     * @param {object | FetchOptions} input
     * @returns {FetchOptions}
     */
    static from(input: object | FetchOptions): FetchOptions;
    /**
     * @param {object} input
     * @param {boolean} [input.globals=true]
     * @param {boolean} [input.inherit=true]
     * @param {boolean} [input.refs=true]
     * @param {any} [input.defaultValue=undefined]
     * @param {boolean} [input.allowDirs=true]
     */
    constructor(input?: {
        globals?: boolean | undefined;
        inherit?: boolean | undefined;
        refs?: boolean | undefined;
        defaultValue?: any;
        allowDirs?: boolean | undefined;
    });
    /** @type {boolean} Whether to load global variables */
    globals: boolean;
    /** @type {boolean} Whether to apply inheritance from parent directories */
    inherit: boolean;
    /** @type {boolean} Whether to resolve $ref references */
    refs: boolean;
    /** @type {any} Fallback value if document not found */
    defaultValue: any;
    /** @type {boolean} Whether to treat URI as directory if no file found */
    allowDirs: boolean;
}
