import DB from "./DB.js"

export default class ExtendedDB extends DB {
	hello() {
		return "Hello"
	}
}

class Test {
	/** @type {DB} */
	db
	constructor(input = {}) {
		const {
			db
		} = input
		this.db = db
	}
}

const test = new Test({ db: new ExtendedDB() })

