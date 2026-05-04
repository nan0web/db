import { describe, it, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import DB from '../index.js'
import { DBFS } from '@nan0web/db-fs'
import { NoConsole } from '@nan0web/log'
import { DatasetParser, DocsParser } from '@nan0web/test'

const fs = new DBFS()
let pkg

before(async () => {
	const doc = await fs.loadDocument('package.json', {})
	pkg = doc || {}
})

let console = new NoConsole()
beforeEach(() => {
	console = new NoConsole()
})

function testRender() {
	/**
	 * @docs
	 * # DB-First Architecture Pattern
	 *
	 * ## Description
	 * Цей паттерн встановлює стандарт взаємодії доменної логіки з оточенням виключно через інтерфейс `DB`.
	 * Це дозволяє досягти повної ізоляції логіки (Total Logic Isolation) та крос-платформеності.
	 *
	 * ## Ключові правила
	 * 1. **Zero System Imports**: Заборонено використовувати `node:fs`, `node:path`, `node:os` у доменних моделях.
	 * 2. **Context via DB**: Усі операції зі шляхами виконуються через екземпляр `db`.
	 * 3. **Standard Aliases**:
	 *    - `~` — точка входу в конфігурацію додатка (`$HOME/.nan0web/`).
	 *    - `store` — аліас для глобального реєстру (`~/store/`).
	 *
	 * ## Приклади використання
	 * ### Робота зі шляхами (Path Resolving)
	 * Замість `path.join` використовуйте `db.resolve()`.
	 */
	it('How to resolve paths without node:path?', async () => {
		//import DB from '@nan0web/db'
		const db = new DB({ root: '/workspace' })
		const home = new DB({ root: './.nan0web', cwd: '/home/user' })
		db.mount('~', home)

		const storePath = db.resolveSync('~/store/registry.csv')

		console.info(storePath) // ~/store/registry.csv
		console.info(db.location(storePath)) // /home/user/.nan0web/store/registry.csv
		assert.equal(console.output()[0][1], '~/store/registry.csv')
		assert.equal(console.output()[1][1], '/home/user/.nan0web/store/registry.csv')
	})

	/**
	 * @docs
	 * ### Нормалізація шляхів (Normalization)
	 * Використовуйте `db.relative()` для перетворення абсолютних шляхів у відносні щодо робочого простору.
	 */
	it('How to normalize absolute paths to workspace-relative?', async () => {
		//import DB from '@nan0web/db'
		const workspaceRoot = '/Users/i/src/project'
		const db = new DB({ root: workspaceRoot })

		const absPath = '/Users/i/src/project/packages/core/src/index.js'
		const relPath = db.relative(absPath)

		console.info(relPath) // packages/core/src/index.js
		assert.equal(console.output()[0][1], 'packages/core/src/index.js')
	})

	/**
	 * @docs
	 * ### Завантаження документів (Loading Documents)
	 * Використовуйте `db.loadDocumentAs()` для роботи з типізованими даними.
	 */
	it('How to load CSV from store via alias?', async () => {
		//import DB from '@nan0web/db'
		const storeData = [{ name: 'ui', path: '/workspace/packages/ui' }]
		const home = new DB({
			root: './.nan0web',
			cwd: '/home/user',
			predefined: [['store/test.csv', storeData]],
		})
		await home.connect()

		const db = new DB({ root: '/workspace' })
		db.mount('~', home)

		const data = await db.loadDocument('~/store/test.csv')

		console.info(data[0].name) // ui
		assert.equal(console.output()[0][1], 'ui')
	})
}

describe('DB-FIRST-PATTERN.md testing', testRender)

describe('Rendering DB-FIRST-PATTERN.md', async () => {
	const parser = new DocsParser()
	const sourceCode = await fs.loadDocument('src/docs/DB-FIRST-PATTERN.md.js')
	const text = String(parser.decode(sourceCode))
	const targetPath = 'docs/uk/DB-FIRST-PATTERN.md'

	it('generates documentation in docs/uk/DB-FIRST-PATTERN.md', async () => {
		await fs.saveDocument(targetPath, text)
		const dataset = DatasetParser.parse(text, pkg.name)
		await fs.saveDocument('.datasets/DB-FIRST-PATTERN.dataset.jsonl', dataset)

		const savedText = await fs.loadDocument(targetPath)
		const content = typeof savedText === 'string' ? savedText : JSON.stringify(savedText)
		assert.ok(content.includes('# DB-First Architecture Pattern'))
		assert.ok(content.includes('## Ключові правила'))
	})
})
