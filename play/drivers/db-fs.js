#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { DB, DocumentStat } from '../../src/index.js'
import { pressAnyKey } from '../simple-demos.js'
import { tabbed } from '../utils/index.js'

export async function runFsDriverDemo(console) {
	console.clear()
	console.success("FS Driver Demo")

	// Create temporary directory for demo
	const demoDir = path.join(process.cwd(), 'tmp-db-demo')
	if (!fs.existsSync(demoDir)) {
		fs.mkdirSync(demoDir, { recursive: true })
	}

	// Setup DB with FS driver
	const db = new DB({
		cwd: demoDir,
		console: console
	})

	// Override methods to use node:fs
	db.loadDocument = async function(uri, defaultValue = undefined) {
		const filePath = path.join(this.cwd, uri)
		try {
			if (fs.existsSync(filePath)) {
				const content = fs.readFileSync(filePath, 'utf8')
				if (this.extname(uri) === '.json') {
					return JSON.parse(content)
				}
				return content
			}
		} catch (error) {
			this.console.warn(`Failed to load document: ${uri}`, error.message)
		}
		return defaultValue
	}

	db.saveDocument = async function(uri, document) {
		const filePath = path.join(this.cwd, uri)
		const dirPath = path.dirname(filePath)
		
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true })
		}
		
		if (typeof document === 'object') {
			fs.writeFileSync(filePath, JSON.stringify(document, null, 2))
		} else {
			fs.writeFileSync(filePath, String(document))
		}
		
		// Update metadata
		const stat = fs.statSync(filePath)
		this.meta.set(uri, new DocumentStat({
			isFile: true,
			mtimeMs: stat.mtimeMs,
			size: stat.size
		}))
		
		return true
	}

	db.statDocument = async function(uri) {
		const filePath = path.join(this.cwd, uri)
		try {
			const stat = fs.statSync(filePath)
			return new DocumentStat({
				isFile: stat.isFile(),
				isDirectory: stat.isDirectory(),
				mtimeMs: stat.mtimeMs,
				size: stat.size
			})
		} catch (error) {
			return new DocumentStat()
		}
	}

	db.listDir = async function(uri = '.') {
		const dirPath = path.join(this.cwd, uri)
		try {
			const items = fs.readdirSync(dirPath)
			return items.map(item => {
				const fullPath = path.join(uri, item)
				const stat = fs.statSync(path.join(this.cwd, fullPath))
				return {
					name: item,
					path: fullPath,
					isFile: stat.isFile(),
					isDirectory: stat.isDirectory(),
					stat: new DocumentStat({
						isFile: stat.isFile(),
						isDirectory: stat.isDirectory(),
						mtimeMs: stat.mtimeMs,
						size: stat.size
					})
				}
			})
		} catch (error) {
			this.console.warn(`Failed to list directory: ${uri}`, error.message)
			return []
		}
	}

	await db.connect()

	console.info("FS Driver DB connected:")
	console.info(`• Working directory: ${demoDir}`)
	console.info(`• Root: ${db.root}\n`)

	await pressAnyKey(console)

	// Demo: save documents
	console.info("1. Saving documents to filesystem:")
	await db.saveDocument("user.json", { name: "Alice", age: 30 })
	await db.saveDocument("posts/first.md", "# First Post\nHello World!")
	await db.saveDocument("posts/second.md", "# Second Post\nWelcome!")
	
	console.info(tabbed("Created files:"))
	console.info(tabbed("• user.json → { name: 'Alice', age: 30 }"))
	console.info(tabbed("• posts/first.md → '# First Post\\nHello World!'"))
	console.info(tabbed("• posts/second.md → '# Second Post\\nWelcome!'"))

	await pressAnyKey(console)

	// Demo: load documents
	console.info("\n2. Loading documents from filesystem:")
	const user = await db.get("user.json")
	const firstPost = await db.get("posts/first.md")
	
	console.info(tabbed(`user.json: ${JSON.stringify(user, null, 2)}`))
	console.info(tabbed(`posts/first.md: "${firstPost}"`))

	await pressAnyKey(console)

	// Demo: list directory
	console.info("\n3. Listing directory contents:")
	const postsDir = await db.listDir("posts")
	console.info(tabbed("posts/ directory contents:"))
	postsDir.forEach(item => {
		console.info(tabbed(`• ${item.name} (${item.stat.size} bytes, ${item.stat.mtime.toISOString()})`))
	})

	await pressAnyKey(console)

	// Demo: stat document
	console.info("\n4. Getting document stats:")
	const userStat = await db.stat("user.json")
	console.info(tabbed(`user.json stats:`))
	console.info(tabbed(`  Size: ${userStat.size} bytes`))
	console.info(tabbed(`  Modified: ${userStat.mtime.toISOString()}`))
	console.info(tabbed(`  Exists: ${userStat.exists}`))

	await pressAnyKey(console)

	// Cleanup
	console.info("\n5. Cleaning up demo files:")
	fs.rmSync(demoDir, { recursive: true, force: true })
	console.info(tabbed(`Removed demo directory: ${demoDir}`))

	console.success("\nFS Driver demo complete! 💾")
}