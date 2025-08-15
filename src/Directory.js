function Filter() {

}

class Directory {
	static FILE = "_"
	static INDEX = "index"
	static DATA_EXTNAMES = [".json", ".yaml", ".yml", ".nano", ".csv"]
	get entries() {
		return []
	}
	get entriesFn() {
		return Function()
	}
	get filter() {
		return Filter()
	}
}

export default Directory
