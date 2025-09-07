export default class FetchOptions {
    /**
     * @param {object} input
     * @returns {FetchOptions}
     */
    static from(input: object): FetchOptions;
    constructor(input?: {});
    globals: boolean;
    inherit: boolean;
    refs: boolean;
    defaultValue: undefined;
    allowDirs: boolean;
}
