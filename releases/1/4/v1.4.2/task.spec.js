/**
 * Release v1.4.2 Contract: Preserve literal keys containing OBJECT_DIVIDER
 *
 * Keys in YAML documents may contain '/' (slash) as part of the key name,
 * e.g. "Manage / Update Agent Workflows". These must survive the
 * flatten → unflatten roundtrip without being split into nested objects.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import Data from '../../../../src/Data.js'
import DB from '../../../../src/DB/DB.js'

describe('Release v1.4.2: Literal Slash Preservation in Data Keys', () => {
	describe('1. Data.flatten() — escapes literal dividers in keys', () => {
		it('preserves keys containing "/" in flat output', () => {
			const obj = { 'Manage / Update': 'value' }
			const flat = Data.flatten(obj)

			// The flat key must NOT be split into nested segments.
			// There should be exactly one key, and unflatten must roundtrip.
			const keys = Object.keys(flat)
			assert.equal(keys.length, 1, 'Should produce exactly one flat key')
			assert.equal(flat[keys[0]], 'value')
		})

		it('does not escape "/" used as a real path separator (nested objects)', () => {
			const obj = { a: { b: 1 } }
			const flat = Data.flatten(obj)
			assert.deepEqual(flat, { 'a/b': 1 })
		})
	})

	describe('2. Data.unflatten() — roundtrip with literal dividers', () => {
		it('roundtrip: flatten → unflatten preserves keys with "/"', () => {
			const original = { 'Manage / Update Agent Workflows': 'переклад' }
			const roundtripped = Data.unflatten(Data.flatten(original))
			assert.deepEqual(roundtripped, original)
		})

		it('roundtrip: mixed normal and slash-containing keys', () => {
			const original = {
				title: 'Hello',
				'Manage / Update': 'Керування',
				nested: { deep: 'value' },
				'Input / Output': 'I/O',
			}
			const roundtripped = Data.unflatten(Data.flatten(original))
			assert.deepEqual(roundtripped, original)
		})

		it('roundtrip: deeply nested object with slash keys at leaf level', () => {
			const original = {
				menu: {
					'File / Open': 'Відкрити',
					'File / Save': 'Зберегти',
					normal: 'звичайний',
				},
			}
			const roundtripped = Data.unflatten(Data.flatten(original))
			assert.deepEqual(roundtripped, original)
		})
	})

	describe('3. Data.find() — locates values by keys with "/"', () => {
		it('finds top-level key containing "/" via array path', () => {
			const obj = { 'Manage / Update': 'value' }
			// Array path bypasses split — direct key lookup
			const result = Data.find(['Manage / Update'], obj)
			assert.equal(result, 'value')
		})

		it('finds nested key containing "/" via array path', () => {
			const obj = { menu: { 'File / Open': 'Відкрити' } }
			const result = Data.find(['menu', 'File / Open'], obj)
			assert.equal(result, 'Відкрити')
		})

		it('finds nested key containing "/" via parent string path', () => {
			const obj = { menu: { 'File / Open': 'Відкрити' } }
			const result = Data.find('menu', obj)
			assert.equal(result['File / Open'], 'Відкрити')
		})
	})

	describe('4. DB.resolveReferences() — fetch preserves slash keys', () => {
		it('resolveReferences roundtrip does not split slash keys', async () => {
			const db = new DB({ connected: true })
			const data = {
				'Manage / Update': 'Керування',
				normal: 'звичайний',
			}
			// resolveReferences flattens and unflattens internally
			const result = await db.resolveReferences(data)
			assert.deepEqual(result, data)
		})
	})

	describe('5. Backward compatibility — existing behavior preserved', () => {
		it('standard nested objects flatten and unflatten correctly', () => {
			const original = { a: { b: { c: 1 } } }
			assert.deepEqual(Data.unflatten(Data.flatten(original)), original)
		})

		it('arrays flatten and unflatten correctly', () => {
			const original = { items: [1, 2, 3] }
			assert.deepEqual(Data.unflatten(Data.flatten(original)), original)
		})

		it('empty objects and arrays preserved', () => {
			const original = { empty: {}, arr: [] }
			assert.deepEqual(Data.unflatten(Data.flatten(original)), original)
		})
	})
})
