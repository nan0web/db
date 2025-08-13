/**
 * Flattens a nested object into a single-level object with path-like keys.
 * @static
 * @param {Object} obj - The object to flatten.
 * @param {string} [parent=''] - Parent key prefix (used recursively).
 * @param {Object} [res={}] - Result object (used recursively).
 * @returns {Object} Flattened object with path keys.
 */
export function flatten(obj: any, parent?: string | undefined, res?: any): any;
/**
 * Unflattens an object with path-like keys into a nested structure.
 * @static
 * @param {Object} data - The flattened object to unflatten.
 * @returns {Object} The unflattened nested object.
 */
export function unflatten(data: any): any;
/**
 * Deep merges two objects, creating a new object.
 * Arrays are replaced rather than merged.
 * @static
 * @param {Object} target - The target object to merge into.
 * @param {Object} source - The source object to merge from.
 * @returns {Object} The merged object.
 */
export function merge(target: any, source: any): any;
/**
 * Finds a value in an object by path.
 * @static
 * @param {string|string[]} path - The path to search (as string or array).
 * @param {Object} obj - The object to search in.
 * @returns {*} The found value or undefined.
 */
export function find(path: string | string[], obj: any): any;
export default Data;
/**
 * Data manipulation utilities for flattening/unflattening objects and deep merging.
 * @class
 */
declare class Data {
    /** @comment #dev/data.md */
    /** @type {string} */
    static OBJECT_DIVIDER: string;
    /** @type {string} */
    static ARRAY_WRAPPER: string;
    /** @type {number} */
    static MAX_DEEP_UNFLATTEN: number;
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
     * @static
     * @param {Object} obj - The object to flatten.
     * @param {string} [parent=''] - Parent key prefix (used recursively).
     * @param {Object} [res={}] - Result object (used recursively).
     * @returns {Object} Flattened object with path keys.
     */
    static flatten(obj: any, parent?: string | undefined, res?: any): any;
    /**
     * Finds a value in an object by path.
     * @static
     * @param {string|string[]} path - The path to search (as string or array).
     * @param {Object} obj - The object to search in.
     * @returns {*} The found value or undefined.
     */
    static find(path: string | string[], obj: any): any;
    /**
     * Finds a value in an object by path, optionally skipping scalar values.
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
     * @static
     * @param {Object} data - The flattened object to unflatten.
     * @returns {Object} The unflattened nested object.
     */
    static unflatten(data: any): any;
    /**
     * Deep merges two objects, creating a new object.
     * Arrays are replaced rather than merged.
     * @static
     * @param {Object} target - The target object to merge into.
     * @param {Object} source - The source object to merge from.
     * @returns {Object} The merged object.
     */
    static merge(target: any, source: any): any;
}
