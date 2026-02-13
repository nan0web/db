#!/usr/bin/env node

import process from 'node:process'

import Logger from '@nan0web/log'
import { select } from '@nan0web/ui-cli'

import { runFsDriverDemo } from './db-fs.js'
import { runAuthDemo } from '../auth.js'
import { runSimpleDemos } from '../simple-demos.js'

const console = new Logger({ level: 'info' })

async function chooseDriverDemo() {
	const demos = [
		{ name: 'FS Driver (node:fs)', value: 'fs' },
		{ name: 'Authorization Demo', value: 'auth' },
		{ name: '← Back to Main Menu', value: 'back' },
	]

	const choice = await select({
		title: 'Select Driver Demo:',
		prompt: Logger.style('[driver]: ', { color: Logger.MAGENTA }),
		invalidPrompt: Logger.style('[driver invalid]', { color: Logger.RED }) + ': ',
		options: demos.map((d) => d.name),
		console,
	})

	return demos[choice.index].value
}

async function showMenu() {
	console.info('\n' + '='.repeat(50))
	console.info('Driver demo completed. Returning to driver menu...')
	console.info('='.repeat(50) + '\n')
}

export async function runDriverDemos(console) {
	while (true) {
		try {
			const demoType = await chooseDriverDemo()

			switch (demoType) {
				case 'fs':
					await runFsDriverDemo(console)
					break
				case 'auth':
					await runAuthDemo(console)
					break
				case 'back':
					return
				default:
					console.warn('Unknown driver demo selected')
			}

			await showMenu()
		} catch (error) {
			if (error.message?.includes('cancel')) {
				console.warn('\nDemo cancelled. Returning to menu...')
				await showMenu()
				continue
			}
			console.error(error)
			process.exit(1)
		}
	}
}
