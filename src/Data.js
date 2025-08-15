/**
 * Data manipulation utilities for flattening/unflattening objects and deep merging.
 * @class
 */
class Data {
	/** @comment #dev/data.md */
	/** @type {string} */
	static OBJECT_DIVIDER = '/'
	/** @type {string} */
	static ARRAY_WRAPPER = '[]'
	/** @type {number} */
	static MAX_DEEP_UNFLATTEN = 99
	/** @type {string} */
	static REFERENCE_KEY = "$ref"

	/**
	 * Resets the array wrapper to default value.
	 * @static
	 */
	static resetArrayWrapper() {
		Data.ARRAY_WRAPPER = '[]'
	}

	/**
	 * Resets the object divider to default value.
	 * @static
	 */
	static resetObjectDivider() {
		Data.OBJECT_DIVIDER = '/'
	}

	/**
	 * Sets a custom array wrapper for flattening/unflattening.
	 * @static
	 * @param {string} wrapper - The new array wrapper.
	 */
	static setArrayWrapper(wrapper) {
		Data.ARRAY_WRAPPER = wrapper
	}

	/**
	 * Sets a custom object divider for flattening/unflattening.
	 * @static
	 * @param {string} divider - The new object divider.
	 */
	static setObjectDivider(divider) {
		Data.OBJECT_DIVIDER = divider
	}

	/**
	 * Flattens a nested object into a single-level object with path-like keys.
	 * @static
	 * @param {Object} obj - The object to flatten.
	 * @param {string} [parent=''] - Parent key prefix (used recursively).
	 * @param {Object} [res={}] - Result object (used recursively).
	 * @returns {Object} Flattened object with path keys.
	 */
	static flatten(obj, parent = '', res = {}) {
		for (let key in obj) {
			if (Object.hasOwn(obj, key)) {
				const corrKey = Array.isArray(obj)
					? `${Data.ARRAY_WRAPPER[0]}${key}${Data.ARRAY_WRAPPER[1]}` : key
				const propName = parent ? `${parent}${Data.OBJECT_DIVIDER}${corrKey}` : corrKey
				if (typeof obj[key] === 'object' && null !== obj[key]) {
					Data.flatten(obj[key], propName, res)
				} else {
					res[propName] = obj[key]
				}
			}
		}
		return res
	}

	/**
	 * Finds a value in an object by path.
	 * @static
	 * @param {string|string[]} path - The path to search (as string or array).
	 * @param {Object} obj - The object to search in.
	 * @returns {*} The found value or undefined.
	 */
	static find(path, obj) {
		const arrPath = Array.isArray(path) ? path : path.split(Data.OBJECT_DIVIDER)
		let acc = obj
		for (let key of arrPath) {
			if (acc === undefined) return undefined
			if (typeof key?.match === 'function') {
				const arrayMatch = key.match(new RegExp(`^\\${Data.ARRAY_WRAPPER[0] || ''}(\\d+)\\${Data.ARRAY_WRAPPER[1] || ''}$`))
				if (arrayMatch) {
					key = String(parseInt(arrayMatch[1], 10))
				}
			}
			const next = acc[key]
			if ('object' === typeof next && null !== next) {
				acc = next
			} else {
				return next
			}
		}
		return acc
	}

	/**
	 * Finds a value in an object by path, optionally skipping scalar values.
	 * @static
	 * @param {string[]} path - The path to search.
	 * @param {Object} obj - The object to search in.
	 * @param {boolean} [skipScalar=false] - Whether to skip scalar values.
	 * @returns {{value: any, path: string[]}} Object with found value and path.
	 */
	static findValue(path, obj, skipScalar = false) {
		let value
		let parentPath = path.slice()
		let i = 0
		do {
			value = Data.find(parentPath, obj)
			if (skipScalar && !['object', 'function'].includes(typeof value)) {
				value = undefined
			}
			if (undefined === value) {
				parentPath.pop()
			}
		} while (undefined === value && parentPath.length && ++i < Data.MAX_DEEP_UNFLATTEN)
		return { value, path: parentPath }
	}

	/**
	 * Unflattens an object with path-like keys into a nested structure.
	 * @static
	 * @param {Object} data - The flattened object to unflatten.
	 * @returns {Object} The unflattened nested object.
	 */
	static unflatten(data) {
		const result = {}
		const noRegExp = new RegExp(`^\\${Data.ARRAY_WRAPPER[0] || ''}(\\d+)\\${Data.ARRAY_WRAPPER[1] || ''}$`)

		for (let flatKey in data) {
			const keys = flatKey.split(Data.OBJECT_DIVIDER)
			/** @type {string[]} */
			const path = []
			for (let i = 0; i < keys.length - 1; i++) {
				let curr = keys[i]
				const next = keys[i + 1] || null
				const parent = Data.find(path, result) || result
				const match = curr.match(noRegExp)
				if (match) {
					curr = String(parseInt(match[1], 10))
				}
				if (null !== next && next.match(noRegExp)) {
					parent[curr] = parent[curr] || []
				}
				else if ('object' === typeof parent && null !== parent) {
					parent[curr] = parent[curr] || {}
				}
				else {
					throw new TypeError(`Element is not an object in ${path.join(Data.OBJECT_DIVIDER)}`)
				}
				path.push(curr)
			}
			const { value } = Data.findValue(path, result)

			const key = String(keys.pop() ?? "")
			if (Array.isArray(value)) {
				const match = key.match(noRegExp)
				if (match) {
					const curr = parseInt(match[1], 10)
					value[curr] = data[flatKey]
				} else {
					value[key] = data[flatKey]
				}
			} else if (null !== value && 'object' === typeof value) {
				value[key] = data[flatKey]
			} else {
				const parentPath = keys.slice(0, keys.length - 1)
				const { value: v, path: p } = Data.findValue(parentPath, result, true)
				if ('object' === typeof v) {
					const path = flatKey.slice(p.join(Data.OBJECT_DIVIDER).length + 1)
					const parentValue = Data.find(p, result)
					parentValue[path] = data[flatKey]
				} else {
					throw new Error(`Value key not found: ${key} => ${keys.join(Data.OBJECT_DIVIDER)}`)
				}
			}
		}
		return result
	}

	/**
	 * Deep merges two objects, creating a new object.
	 * Arrays are replaced rather than merged.
	 * @static
	 * @param {Object} target - The target object to merge into.
	 * @param {Object} source - The source object to merge from.
	 * @returns {Object} The merged object.
	 */
	static merge(target, source) {
		let newTarget = JSON.parse(JSON.stringify(target))

		for (const key in source) {
			if (!Object.hasOwn(source, key)) continue
			if (source[key] && typeof source[key] === 'object') {
				if (Array.isArray(source[key])) {
					newTarget[key] = source[key].slice()
				} else {
					newTarget[key] = newTarget[key] || {}
					newTarget[key] = Data.merge(newTarget[key], source[key])
				}
			} else {
				newTarget[key] = source[key]
			}
		}
		return newTarget
	}

	/**
	 * Merges two flat [path, value] arrays into one flat array.
	 * Handles $ref objects by expanding their properties into the path.
	 * Later entries override earlier ones.
	 *
	 * @static
	 * @param {Array<[string, any]>} target - Base flat data entries.
	 * @param {Array<[string, any]>} source - Override flat data entries.
	 * @param {{ referenceKey?: string }} options - Merge options.
	 * @returns {Array<[string, any]>} Merged flat entries.
	 */
	static mergeFlat(target, source, { referenceKey = Data.REFERENCE_KEY } = {}) {
		const map = new Map()

		/**
		 * Add an entry to the map.
		 * @param {[string, any]} entry - Tuple of key and value.
		 * @param {boolean} overwrite - Whether to overwrite existing keys.
		 */
		const add = (entry, overwrite) => {
			const [rawKey, rawVal] = entry
			if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal)) {
				let baseKey = rawKey
				// Handle references $ref – merge object into parent path.
				if (referenceKey && rawKey.endsWith(Data.OBJECT_DIVIDER + referenceKey)) {
					baseKey = rawKey.slice(0, -4 - Data.OBJECT_DIVIDER.length)
				}
				for (const prop in rawVal) {
					if (Object.hasOwn(rawVal, prop)) {
						const fullKey = `${baseKey}${Data.OBJECT_DIVIDER}${prop}`
						if (overwrite || !map.has(fullKey)) {
							map.set(fullKey, rawVal[prop])
						}
					}
				}
			} else {
				if (overwrite || !map.has(rawKey)) {
					map.set(rawKey, rawVal)
				}
			}
		}

		// Base data first.
		for (const entry of target) {
			add(entry, false)
		}
		// Override data second.
		for (const entry of source) {
			add(entry, true)
		}

		// Return as array of [key, value] tuples.
		return Array.from(map.entries()).sort((a, b) => String(a[0]).localeCompare(b[0]))
	}

	static getParentKey(key) {
		const arr = key.split(Data.OBJECT_DIVIDER)
		arr.pop()
		return arr.join(Data.OBJECT_DIVIDER)
	}

	static flatSiblings(flat, key, parentKey = Data.getParentKey(key)) {
		if (!Array.isArray(flat)) flat = Object.entries(Data.flatten(flat))
		const path = "" === parentKey ? "" : parentKey + Data.OBJECT_DIVIDER
		const keyPath = key + Data.OBJECT_DIVIDER
		return flat.filter(
			([k]) => k.startsWith(path) && k !== key && !k.startsWith(keyPath)
		)
	}
}

export const flatten = Data.flatten
export const unflatten = Data.unflatten
export const merge = Data.merge
export const find = Data.find
export const mergeFlat = Data.mergeFlat
export const flatSiblings = Data.flatSiblings

export default Data
