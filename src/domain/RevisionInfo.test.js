import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import RevisionInfo from './RevisionInfo.js'

describe('Domain: RevisionInfo', () => {
	it('initializes with default values', () => {
		const rev = new RevisionInfo()
		assert.equal(rev.sha, '')
		assert.equal(rev.key, '')
		assert.equal(rev.author, '')
		assert.equal(rev.message, '')
		assert.equal(rev.timestamp, '')
		assert.equal(rev.size, 0)
		assert.equal(rev.date, null)
		assert.equal(rev.shortSha, '')
	})

	it('correctly maps date and shortSha', () => {
		const ts = new Date('2026-04-04T12:00:00Z').toISOString()
		const rev = new RevisionInfo({
			sha: '1234567890abcdef',
			timestamp: ts,
		})

		assert.equal(rev.shortSha, '1234567')
		assert.ok(rev.date instanceof Date)
		assert.equal(rev.date.toISOString(), ts)
	})

	it('verifies required schema properties', () => {
		assert.equal(RevisionInfo.sha.required, true)
		assert.equal(RevisionInfo.key.required, true)
		assert.equal(RevisionInfo.size.hidden, true)
	})
})
