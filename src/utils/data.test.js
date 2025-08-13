import { suite, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import Data, {
	flatten,
	unflatten,
	merge,
	find
} from './data.js'

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
})