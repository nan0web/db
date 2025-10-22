export const tabbed = (str, padding = 3) => {
	if ("number" === typeof padding) {
		padding = " ".repeat(padding)
	}
	return str.split("\n").map(s => padding + s).join("\n")
}
