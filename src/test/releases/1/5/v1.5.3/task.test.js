import { suite, test } from 'node:test'
import assert from 'node:assert/strict'
import { extname } from '../../../../../DB/path.js'
import Directory from '../../../../../Directory.js'

suite('Release v1.5.3: Path & Config Verification', () => {
	suite('extname() logic', () => {
		test('should ignore dots in directory names', () => {
			assert.strictEqual(extname('/Users/user/src/nan.web/apps/t.json'), '.json')
			assert.strictEqual(extname('C:/Projects/v1.0/index.html'), '.html')
		})

		test('should handle dotfiles correctly', () => {
			assert.strictEqual(extname('.gitignore'), '')
			assert.strictEqual(extname('/home/user/.bashrc'), '')
			assert.strictEqual(extname('.config.js'), '.js')
		})

		test('should return empty string for no extension', () => {
			assert.strictEqual(extname('README'), '')
			assert.strictEqual(extname('/path/to/folder/'), '')
		})
	})

	suite('Directory.isConfig() logic', () => {
		test('should return true for valid config files', () => {
			assert.strictEqual(Directory.isConfig('_.yaml'), true)
			assert.strictEqual(Directory.isConfig('path/to/_.nan0'), true)
			assert.strictEqual(Directory.isConfig('/absolute/path/_.json'), true)
		})

		test('should return false for regular files', () => {
			assert.strictEqual(Directory.isConfig('file.json'), false)
			assert.strictEqual(Directory.isConfig('_.txt'), false)
			assert.strictEqual(Directory.isConfig('path/to/file.yaml'), false)
		})

		test('should return false for invalid paths', () => {
			assert.strictEqual(Directory.isConfig(''), false)
			assert.strictEqual(Directory.isConfig(null), false)
			assert.strictEqual(Directory.isConfig(123), false)
		})
	})
})
