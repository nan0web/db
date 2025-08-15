import { suite, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import Data, {
	flatten,
	unflatten,
	merge,
	find
} from './Data.js'

suite('Data', () => {
	describe('Static Properties', () => {
		it('should have default constants', () => {
			assert.strictEqual(Data.OBJECT_DIVIDER, '/')
			assert.strictEqual(Data.ARRAY_WRAPPER, '[]')
			assert.strictEqual(Data.MAX_DEEP_UNFLATTEN, 99)
		})
	})

	describe('Configuration', () => {
		it('should set and reset array wrapper', () => {
			Data.setArrayWrapper('{}')
			assert.strictEqual(Data.ARRAY_WRAPPER, '{}')
			Data.resetArrayWrapper()
			assert.strictEqual(Data.ARRAY_WRAPPER, '[]')
		})

		it('should set and reset object divider', () => {
			Data.setObjectDivider('.')
			assert.strictEqual(Data.OBJECT_DIVIDER, '.')
			Data.resetObjectDivider()
			assert.strictEqual(Data.OBJECT_DIVIDER, '/')
		})
	})

	describe('flatten()', () => {
		it('should flatten nested objects', () => {
			const obj = { a: { b: { c: 1 } } }
			assert.deepEqual(Data.flatten(obj), { 'a/b/c': 1 })
			assert.deepEqual(flatten(obj), { 'a/b/c': 1 })
		})

		it('should handle arrays', () => {
			const obj = { a: [1, 2, 3] }
			assert.deepEqual(Data.flatten(obj), {
				'a/[0]': 1,
				'a/[1]': 2,
				'a/[2]': 3
			})
		})

		it('should flatten objects with multiple levels', () => {
			const obj = {
				level1: {
					level2: {
						level3: 'deep'
					},
					array: [1, 2]
				}
			}
			assert.deepEqual(Data.flatten(obj), {
				'level1/level2/level3': 'deep',
				'level1/array/[0]': 1,
				'level1/array/[1]': 2
			})
		})
	})

	describe('unflatten()', () => {
		it('should unflatten to nested objects', () => {
			const flat = { 'a/b/c': 1 }
			assert.deepEqual(Data.unflatten(flat), { a: { b: { c: 1 } } })
			assert.deepEqual(unflatten(flat), { a: { b: { c: 1 } } })
		})

		it('should handle arrays', () => {
			const flat = {
				'a/[0]': 1,
				'a/[1]': 2
			}
			assert.deepEqual(Data.unflatten(flat), { a: [1, 2] })
		})

		it('should handle complex structures', () => {
			const flat = {
				'a/b/[0]/c': 1,
				'a/b/[1]/d': 2,
				'x/y': 'value'
			}
			assert.deepEqual(Data.unflatten(flat), {
				a: { b: [{ c: 1 }, { d: 2 }] },
				x: { y: 'value' }
			})
		})
	})

	describe('find()', () => {
		it('should find values by path', () => {
			const obj = { a: { b: { c: 1 } } }
			assert.strictEqual(Data.find('a/b/c', obj), 1)
			assert.strictEqual(find('a/b/c', obj), 1)
		})

		it('should return undefined for missing paths', () => {
			assert.strictEqual(Data.find('a/b/c', {}), undefined)
		})

		it('should find values in arrays', () => {
			const obj = { a: [1, 2, 3] }
			assert.strictEqual(Data.find('a/[1]', obj), 2)
		})
	})

	describe('findValue()', () => {
		it('should find typed values', () => {
			const obj = { a: { b: { c: 1 } } }
			const result = Data.findValue(['a', 'b', 'c'], obj)
			assert.strictEqual(result.value, 1)
			assert.deepStrictEqual(result.path, ['a', 'b', 'c'])
		})

		it('should skip scalar values when requested', () => {
			const obj = { a: { b: { c: 1 } } }
			const result = Data.findValue(['a', 'b', 'c'], obj, true)
			assert.strictEqual(result.value, obj.a.b)
			assert.deepStrictEqual(result.path, ['a', 'b'])
		})

		it('should handle nested arrays', () => {
			const obj = { a: [{ b: 1 }, { c: 2 }] }
			const result = Data.findValue(['a', '[0]', 'b'], obj)
			assert.strictEqual(result.value, 1)
			assert.deepStrictEqual(result.path, ['a', '[0]', 'b'])
		})
	})

	describe('merge()', () => {
		it('should deep merge objects', () => {
			const target = { a: { b: 1 } }
			const source = { a: { c: 2 } }
			assert.deepEqual(Data.merge(target, source), { a: { b: 1, c: 2 } })
			assert.deepEqual(merge(target, source), { a: { b: 1, c: 2 } })
		})

		it('should replace arrays', () => {
			const target = { a: [1, 2] }
			const source = { a: [3, 4] }
			assert.deepEqual(Data.merge(target, source), { a: [3, 4] })
		})

		it('should merge objects with nested arrays correctly', () => {
			const target = {
				a: {
					b: [1, 2],
					c: { d: 'value' }
				}
			}
			const source = {
				a: {
					b: [3, 4],
					e: 'new value'
				}
			}
			assert.deepEqual(Data.merge(target, source), {
				a: {
					b: [3, 4],
					c: { d: 'value' },
					e: 'new value'
				}
			})
		})
	})
	describe("mergeFlat()", () => {
		it("should merge references (nested level)", () => {
			const a = [
				["my/key", { a: 1, b: 2 }],
				["nested/key/$ref", { a: 30, b: 3 }],
			]

			const b = [
				["my/key/b", 9],
				["my/key/c", 12],
				["nested/key/value", "exists"]
			]

			const expected = [
				["my/key/a", 1],
				["my/key/b", 2],
				["my/key/c", 12],
				["nested/key/a", 30],
				["nested/key/b", 3],
				["nested/key/value", "exists"],
			]
			assert.deepEqual(Data.mergeFlat(b, a), expected)
		})
	})
	it("should extend references (top level)", () => {
		const a = [
			// ["$ref", a],
			["title", "Our news"],
			["desc", "We publish news periodically"],
		]
		const b = [
			["$layout", "Blog"],
			["title", "Blog"],
		]
		const expected = [
			["$layout", "Blog"],
			["desc", "We publish news periodically"],
			["title", "Our news"],
		]
		assert.deepEqual(Data.mergeFlat(b, a), expected)
	})
	it("should return flat siblings", () => {
		const flat = [
			["nested/key/$ref", "somewhere"],
			["nested/key/color", "green"],
			["nested/key/font/size", "xl"],
			["nested/key/font/style", "italic"],
			["nested/value", 9],
		]
		assert.deepEqual(Data.flatSiblings(flat, "nested/key/$ref"), flat.slice(1, -1))
		assert.deepEqual(Data.flatSiblings(flat, "nested/key/font/size"), flat.slice(3, -1))
		assert.deepEqual(Data.flatSiblings(flat, "nested/key"), flat.slice(4))
	})
	it("should return top siblings", () => {
		const flat = [
			["$ref", "index#top"],
			["nested/key/$ref", "somewhere"],
			["nested/key/color", "green"],
		]
		assert.deepEqual(Data.flatSiblings(flat, "$ref"), flat.slice(1))
	})
})
