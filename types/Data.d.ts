/**
 * Flattens a nested object into a single-level object with path-like keys.
 * Preserves empty objects/arrays as-is.
 * @static
 * @param {Object} obj - The object to flatten.
 * @param {string} [parent=''] - Parent key prefix (used recursively).
 * @param {Object} [res={}] - Result object (used recursively).
 * @returns {Object} Flattened object with path keys.
 */
export function flatten(obj: any, parent?: string | undefined, res?: any): any;
/**
 * Unflattens an object with path-like keys into a nested structure.
 * Handles array indices and ensures objects are created before assignment.
 * Sorts keys for deterministic rebuilding.
 * @static
 * @param {Object} data - The flattened object to unflatten.
 * @returns {Object} The unflattened nested object.
 */
export function unflatten(data: any): any;
/**
 * Deep merges two objects, creating a new object.
 * Arrays are replaced rather than merged.
 * Preserves original objects without mutation.
 * @static
 * @param {Object} target - The target object to merge into.
 * @param {Object} source - The source object to merge from.
 * @returns {Object} The merged object.
 */
export function merge(target: any, source: any): any;
/**
 * Finds a value in an object by path.
 * Supports array indices via wrapper (e.g., '[0]').
 * Returns undefined if path not found or intermediate value is null/undefined.
 * @static
 * @param {string|string[]} path - The path to search (as string or array).
 * @param {Object} obj - The object to search in.
 * @returns {*} The found value or undefined.
 */
export function find(path: string | string[], obj: any): any;
/**
 * Merges two flat [path, value] arrays into one flat array.
 * Handles $ref objects by expanding their properties into the path.
 * Later entries override earlier ones.
 *
 * @static
 * @param {Array<Array<string, any>>} target - Base flat data entries.
 * @param {Array<Array<string, any>>} source - Override flat data entries.
 * @param {{ referenceKey?: string }} options - Merge options.
 * @returns {Array<Array<string, any>>} Merged flat entries.
 */
export function mergeFlat(target: Array<Array<string, any>>, source: Array<Array<string, any>>, { referenceKey }?: {
    referenceKey?: string;
}): Array<Array<string, any>>;
/**
 * Gets flat sibling entries of a specific key.
 * Filters flat entries at the same level (excluding self).
 * @static
 * @param {Array<Array<string, any>>|Object} flat - Flattened data.
 * @param {string} key - The target key to find siblings for.
 * @param {string} [parentKey] - Optional parent key to avoid recomputation.
 * @returns {Array<Array<string, any>>} Flat sibling entries.
 */
export function flatSiblings(flat: Array<Array<string, any>> | any, key: string, parentKey?: string | undefined): Array<Array<string, any>>;
export default Data;
/**
 * Data manipulation utilities for flattening/unflattening objects and deep merging.
 * Every data is stored somewhere, so manipulating with paths and parent items also provided.
 * Supports reference handling for $ref keys in flat structures.
 * Used internally by DB for inheritance, globals, and reference resolution.
 *
 * Key features:
 * - Path-based find with array index support (e.g., 'arr/[0]/key')
 * - Deep merge that replaces arrays and merges objects
 * - Flatten/unflatten with custom dividers and array wrappers
 * - Parent path extraction for hierarchical data
 *
 * Usage:
 * ```js
 * const flat = Data.flatten({ a: { b: 1 } }); // { 'a/b': 1 }
 * const nested = Data.unflatten(flat); // { a: { b: 1 } }
 * const merged = Data.merge({ a: 1 }, { b: 2 }); // { a: 1, b: 2 }
 * ```
 *
 * Configuration:
 * - `Data.OBJECT_DIVIDER = '/'` - Key path separator
 * - `Data.ARRAY_WRAPPER = '[]'` - Array index wrapper
 *
 * @class
 */
declare class Data {
    /** @type {string} */
    static OBJECT_DIVIDER: string;
    /** @type {string} */
    static ARRAY_WRAPPER: string;
    /** @type {number} */
    static MAX_DEEP_UNFLATTEN: number;
    /** @type {string} */
    static REFERENCE_KEY: string;
    /**
     * Resets the array wrapper to default value.
     * @static
     */
    static resetArrayWrapper(): void;
    /**
     * Resets the object divider to default value.
     * @static
     */
    static resetObjectDivider(): void;
    /**
     * Sets a custom array wrapper for flattening/unflattening.
     * @static
     * @param {string} wrapper - The new array wrapper.
     */
    static setArrayWrapper(wrapper: string): void;
    /**
     * Sets a custom object divider for flattening/unflattening.
     * @static
     * @param {string} divider - The new object divider.
     */
    static setObjectDivider(divider: string): void;
    /**
     * Flattens a nested object into a single-level object with path-like keys.
     * Preserves empty objects/arrays as-is.
     * @static
     * @param {Object} obj - The object to flatten.
     * @param {string} [parent=''] - Parent key prefix (used recursively).
     * @param {Object} [res={}] - Result object (used recursively).
     * @returns {Object} Flattened object with path keys.
     */
    static flatten(obj: any, parent?: string | undefined, res?: any): any;
    /**
     * Finds a value in an object by path.
     * Supports array indices via wrapper (e.g., '[0]').
     * Returns undefined if path not found or intermediate value is null/undefined.
     * @static
     * @param {string|string[]} path - The path to search (as string or array).
     * @param {Object} obj - The object to search in.
     * @returns {*} The found value or undefined.
     */
    static find(path: string | string[], obj: any): any;
    /**
     * Finds a value in an object by path, optionally skipping scalar values.
     * Backtracks to find nearest non-scalar parent if skipScalar=true.
     * @static
     * @param {string[]} path - The path to search.
     * @param {Object} obj - The object to search in.
     * @param {boolean} [skipScalar=false] - Whether to skip scalar values.
     * @returns {{value: any, path: string[]}} Object with found value and path.
     */
    static findValue(path: string[], obj: any, skipScalar?: boolean | undefined): {
        value: any;
        path: string[];
    };
    /**
     * Unflattens an object with path-like keys into a nested structure.
     * Handles array indices and ensures objects are created before assignment.
     * Sorts keys for deterministic rebuilding.
     * @static
     * @param {Object} data - The flattened object to unflatten.
     * @returns {Object} The unflattened nested object.
     */
    static unflatten(data: any): any;
    /**
     * Deep merges two objects, creating a new object.
     * Arrays are replaced rather than merged.
     * Preserves original objects without mutation.
     * @static
     * @param {Object} target - The target object to merge into.
     * @param {Object} source - The source object to merge from.
     * @returns {Object} The merged object.
     */
    static merge(target: any, source: any): any;
    /**
     * Merges two flat [path, value] arrays into one flat array.
     * Handles $ref objects by expanding their properties into the path.
     * Later entries override earlier ones.
     *
     * @static
     * @param {Array<Array<string, any>>} target - Base flat data entries.
     * @param {Array<Array<string, any>>} source - Override flat data entries.
     * @param {{ referenceKey?: string }} options - Merge options.
     * @returns {Array<Array<string, any>>} Merged flat entries.
     */
    static mergeFlat(target: Array<Array<string, any>>, source: Array<Array<string, any>>, { referenceKey }?: {
        referenceKey?: string;
    }): Array<Array<string, any>>;
    /**
     * Gets the parent key of a flattened key path.
     * Removes the last segment after OBJECT_DIVIDER.
     * @static
     * @param {string} key - The key path.
     * @returns {string} The parent key path.
     */
    static getParentKey(key: string): string;
    /**
     * Gets flat sibling entries of a specific key.
     * Filters flat entries at the same level (excluding self).
     * @static
     * @param {Array<Array<string, any>>|Object} flat - Flattened data.
     * @param {string} key - The target key to find siblings for.
     * @param {string} [parentKey] - Optional parent key to avoid recomputation.
     * @returns {Array<Array<string, any>>} Flat sibling entries.
     */
    static flatSiblings(flat: Array<Array<string, any>> | any, key: string, parentKey?: string | undefined): Array<Array<string, any>>;
    /**
     * Gets all parent paths of a given path.
     * Includes root if not avoided; appends suffix to each.
     * @static
     * @param {string} path - The path to get parents of.
     * @param {string} [suffix=""] - Suffix to append to each parent path.
     * @param {boolean} [avoidRoot=false] - Whether to exclude the root path.
     * @returns {string[]} Array of parent paths.
     */
    static getPathParents(path: string, suffix?: string | undefined, avoidRoot?: boolean | undefined): string[];
}
