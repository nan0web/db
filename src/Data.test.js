import { suite, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import Data, {
	flatten,
	unflatten,
	merge,
	find,
	mergeFlat,
	flatSiblings
} from './Data.js'

suite('Data', () => {
	describe('Static Properties', () => {
		it('should have default constants', () => {
			assert.strictEqual(Data.OBJECT_DIVIDER, '/')
			assert.strictEqual(Data.ARRAY_WRAPPER, '[]')
			assert.strictEqual(Data.MAX_DEEP_UNFLATTEN, 99)
			assert.strictEqual(Data.REFERENCE_KEY, '$ref')
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

		it('should store empty objects', () => {
			const obj = { code: "UAH", rates: {} }
			assert.deepEqual(Data.flatten(obj), {
				"code": "UAH",
				"rates": {}
			})
		})

		it('should handle non-object values correctly during flattening', () => {
			const obj = { a: null, b: undefined, c: 0, d: false, e: "" }
			assert.deepEqual(Data.flatten(obj), {
				"a": null,
				"b": undefined,
				"c": 0,
				"d": false,
				"e": ""
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

		it('should overwrite the scalar value with object', () => {
			const flat = { 'a/b/c': 1, 'a/b': 'scalar' }
			assert.deepEqual(Data.unflatten(flat), { a: { b: { c: 1 } } })
		})

		it('should throw TypeError when path element is not an object', () => {
			// Create a flat object that would cause a conflict
			// where a path segment that should be an object is actually a scalar
			const flat = { 'a/b': 1, 'a/b/c': 2 }
			assert.deepStrictEqual(Data.unflatten(flat), { a: { b: { c: 2 } } })
		})

		it('should overwrite the value with object if it is a child', () => {
			const flat = {
				'a/b': 'string_value',
				'a/b/c': 'another_value'
			}
			assert.deepEqual(Data.unflatten(flat), { a: { b: { c: "another_value" } } })
		})

		it('should handle array indices correctly during unflattening', () => {
			const flat = {
				'items/[0]/name': 'first',
				'items/[1]/name': 'second'
			}
			const expected = {
				items: [
					{ name: 'first' },
					{ name: 'second' }
				]
			}
			assert.deepEqual(Data.unflatten(flat), expected)
		})

		it('should handle nested arrays and objects', () => {
			const flat = {
				'users/[0]/profile/name': 'John',
				'users/[0]/profile/age': 30,
				'users/[1]/profile/name': 'Jane',
				'users/[1]/profile/age': 25
			}
			const expected = {
				users: [
					{
						profile: {
							name: 'John',
							age: 30
						}
					},
					{
						profile: {
							name: 'Jane',
							age: 25
						}
					}
				]
			}
			assert.deepEqual(Data.unflatten(flat), expected)
		})

		it('should handle empty arrays', () => {
			const flat = {
				'items': []
			}
			assert.deepEqual(Data.unflatten(flat), { items: [] })
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

		it("should find array items", () => {
			const obj = { a: [1, 2, 3] }
			assert.strictEqual(Data.find(['a', '[0]'], obj), 1)
			assert.strictEqual(Data.find('a/0', obj), 1)
		})

		it('should return undefined when accessing non-object types', () => {
			const obj = { a: 1 }

			// Test direct path access on scalar
			assert.strictEqual(Data.find('a/b', obj), undefined)

			// Test array path access on scalar
			assert.strictEqual(Data.find(['a', 'b'], obj), undefined)
		})

		it('should return undefined for paths that go through null values', () => {
			const obj = { a: null }
			assert.strictEqual(Data.find('a/b', obj), undefined)
		})

		it('should find properties in nested objects within arrays', () => {
			const obj = {
				users: [
					{ id: 1, name: 'John' },
					{ id: 2, name: 'Jane' }
				]
			}
			assert.strictEqual(Data.find('users/[0]/name', obj), 'John')
			assert.strictEqual(Data.find('users/[1]/id', obj), 2)
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
			assert.strictEqual(result.value, undefined)
			assert.deepStrictEqual(result.path, [])
		})

		it('should handle nested arrays', () => {
			const obj = { a: [{ b: 1 }, { c: 2 }] }
			const result = Data.findValue(['a', '[0]', 'b'], obj)
			assert.strictEqual(result.value, 1)
			assert.deepStrictEqual(result.path, ['a', '[0]', 'b'])
		})

		it('should handle max depth limit', () => {
			const obj = { a: { b: { c: 1 } } }
			const result = Data.findValue(['a', 'b', 'c'], obj, false)
			assert.strictEqual(result.value, 1)
		})

		it('should return undefined when all paths are scalars and skipScalar=true', () => {
			const obj = { a: { b: 1 } }
			const result = Data.findValue(['a', 'b'], obj, true)
			assert.strictEqual(result.value, undefined)
			assert.deepStrictEqual(result.path, [])
		})

		it('should return the correct parent value when searching deeply nested paths', () => {
			const obj = { a: { b: { c: { d: 42 } } } }
			const result = Data.findValue(['a', 'b', 'c', 'd'], obj)
			assert.strictEqual(result.value, 42)
			assert.deepStrictEqual(result.path, ['a', 'b', 'c', 'd'])
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

		it('should handle empty objects', () => {
			const target = {}
			const source = { a: 1 }
			assert.deepEqual(Data.merge(target, source), { a: 1 })
		})

		it('should create new object instances and not mutate originals', () => {
			const target = { a: { b: 1 } }
			const source = { a: { c: 2 } }
			const merged = Data.merge(target, source)

			// Verify original objects remain unchanged
			assert.deepEqual(target, { a: { b: 1 } })
			assert.deepEqual(source, { a: { c: 2 } })

			// Verify merged result is correct
			assert.deepEqual(merged, { a: { b: 1, c: 2 } })

			// Verify merged object is a new instance
			assert.notStrictEqual(merged, target)
			assert.notStrictEqual(merged.a, target.a)
		})

		it('should handle merging with null values', () => {
			const target = { a: 1 }
			const source = { a: null }
			assert.deepEqual(Data.merge(target, source), { a: null })
		})

		it('should merge complex nested objects correctly', () => {
			const target = {
				user: {
					name: 'John',
					settings: {
						theme: 'light'
					}
				}
			}
			const source = {
				user: {
					age: 30,
					settings: {
						language: 'en'
					}
				}
			}
			const expected = {
				user: {
					name: 'John',
					age: 30,
					settings: {
						theme: 'light',
						language: 'en'
					}
				}
			}
			assert.deepEqual(Data.merge(target, source), expected)
		})
	})

	describe('mergeFlat()', () => {
		it('should merge references (nested level)', () => {
			const a = [
				['my/key', { a: 1, b: 2 }],
				['nested/key/$ref', { a: 30, b: 3 }],
			]

			const b = [
				['my/key/b', 9],
				['my/key/c', 12],
				['nested/key/value', 'exists']
			]

			const expected = [
				['my/key/a', 1],
				['my/key/b', 2],
				['my/key/c', 12],
				['nested/key/a', 30],
				['nested/key/b', 3],
				['nested/key/value', 'exists'],
			]
			assert.deepEqual(Data.mergeFlat(b, a), expected)
			assert.deepEqual(mergeFlat(b, a), expected)
		})

		it('should extend references (top level)', () => {
			const a = [
				['title', 'Our news'],
				['desc', 'We publish news periodically'],
			]
			const b = [
				['$layout', 'Blog'],
				['title', 'Blog'],
			]
			const expected = [
				['$layout', 'Blog'],
				['desc', 'We publish news periodically'],
				['title', 'Our news'],
			]
			assert.deepEqual(Data.mergeFlat(b, a), expected)
			assert.deepEqual(mergeFlat(b, a), expected)
		})

		it('should merge with custom reference key', () => {
			const target = [['key/customRef', { a: 1 }]]
			const source = [['key/value', 2]]
			const expected = [
				['key/a', 1],
				['key/value', 2]
			]
			assert.deepEqual(
				Data.mergeFlat(source, target, { referenceKey: 'customRef' }),
				expected
			)
		})

		it('should handle empty arrays', () => {
			assert.deepEqual(Data.mergeFlat([], []), [])
		})

		it('should sort merged entries alphabetically', () => {
			const target = [['z/key', 1]]
			const source = [['a/key', 2]]
			const expected = [
				['a/key', 2],
				['z/key', 1]
			]
			assert.deepEqual(Data.mergeFlat(target, source), expected)
		})

		it('should handle references that point to primitive values', () => {
			const target = [
				['refKey/$ref', 'primitiveValue'],
				['otherKey', 42]
			]
			const source = [
				['refKey', 1],
				['anotherKey', 'test']
			]
			const expected = [
				['anotherKey', 'test'],
				['otherKey', 42],
				['refKey', 1]
			]
			assert.deepEqual(Data.mergeFlat(target, source), expected)
		})

		it('should merge entries when source contains objects', () => {
			const target = [
				['config/database/host', 'localhost'],
				['config/database/port', 5432]
			]
			const source = [
				['config/database', { host: 'remotehost', user: 'admin' }]
			]
			const expected = [
				['config/database/host', 'remotehost'],
				['config/database/port', 5432],
				['config/database/user', 'admin']
			]
			assert.deepEqual(Data.mergeFlat(target, source), expected)
		})

		it('should properly handle overrides in mergeFlat', () => {
			const target = [
				['key1', 'value1'],
				['key2', 'value2']
			]
			const source = [
				['key1', 'new_value1'],
				['key3', 'value3']
			]
			const expected = [
				['key1', 'new_value1'],
				['key2', 'value2'],
				['key3', 'value3']
			]
			assert.deepEqual(Data.mergeFlat(target, source), expected)
		})
	})

	describe('flatSiblings()', () => {
		it('should return flat siblings', () => {
			const flat = [
				['nested/key/$ref', 'somewhere'],
				['nested/key/color', 'green'],
				['nested/key/font/size', 'xl'],
				['nested/key/font/style', 'italic'],
				['nested/value', 9],
			]
			assert.deepEqual(Data.flatSiblings(flat, 'nested/key/$ref'), flat.slice(1, -1))
			assert.deepEqual(flatSiblings(flat, 'nested/key/$ref'), flat.slice(1, -1))
		})

		it('should return top siblings', () => {
			const flat = [
				['$ref', 'index#top'],
				['nested/key/$ref', 'somewhere'],
				['nested/key/color', 'green'],
				['top', 'level']
			]
			assert.deepEqual(Data.flatSiblings(flat, '$ref'), flat.slice(1))
			assert.deepEqual(flatSiblings(flat, '$ref'), flat.slice(1))
		})

		it('should handle object input', () => {
			const obj = {
				'nested/key/$ref': 'somewhere',
				'nested/key/color': 'green',
				'nested/value': 9,
			}
			const expected = [
				['nested/key/color', 'green']
			]
			assert.deepEqual(
				Data.flatSiblings(obj, 'nested/key/$ref'),
				expected
			)
		})

		it('should return empty array when no siblings exist', () => {
			const flat = [
				['only/key', 'value']
			]
			assert.deepEqual(
				Data.flatSiblings(flat, 'only/key'),
				[]
			)
		})

		it('should correctly identify siblings in complex nested structures', () => {
			const flat = [
				['parent/child1/grandchild1', 'value1'],
				['parent/child1/grandchild2', 'value2'],
				['parent/child2', 'value3'],
				['parent/child1', 'direct_value']
			]
			const r1 = Data.flatSiblings(flat, 'parent/child1')
			assert.deepEqual(r1, flat.slice(0, -1))
			const r2 = Data.flatSiblings(flat, 'parent/child2')
			assert.deepEqual(r2, [flat[0], flat[1], flat[3]])
		})
	})

	describe('getPathParents()', () => {
		it('should properly return path parents', () => {
			const expectations = [
				['en/about/contacts.html', '', ['', 'en', 'en/about']],
				['en/about/contacts.html', '/_', ['/_', 'en/_', 'en/about/_']],
			]
			for (const [path, suffix, exp] of expectations) {
				assert.deepEqual(Data.getPathParents(path, suffix), exp)
			}
		})

		it('should handle path without segments', () => {
			assert.deepEqual(Data.getPathParents('', ''), [''])
			assert.deepEqual(Data.getPathParents('', '/_'), ['/_'])
		})

		it('should exclude root when avoidRoot is true', () => {
			const result = Data.getPathParents('a/b/c', '', true)
			assert.deepEqual(result, ['a', 'a/b'])
		})

		it('should handle single segment path', () => {
			assert.deepEqual(Data.getPathParents('single'), [''])
			assert.deepEqual(Data.getPathParents('single', '/_'), ['/_'])
			assert.deepEqual(Data.getPathParents('single', '/_', true), [])
		})

		it('should return parent paths with suffix correctly applied', () => {
			const result = Data.getPathParents('dir/subdir/file', '/_')
			const expected = ['/_', 'dir/_', 'dir/subdir/_']
			assert.deepEqual(result, expected)
		})
	})
})
