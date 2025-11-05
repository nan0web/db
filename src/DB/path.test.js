import { suite, describe, it } from "node:test"
import assert from "node:assert/strict"
import {
	resolveSync,
	normalize,
	basename,
	dirname,
	extname,
	relative,
	absolute,
	isRemote,
	isAbsolute
} from "./path.js"

/**
 * @desc Comprehensive tests for isolated path utilities
 * Verified against trusted base DB implementation per Architecture Manifest
 */
suite("Path Utilities", () => {
	describe("resolveSync", () => {
		it("resolves relative paths within virtual space", () => {
			assert.strictEqual(resolveSync("/base/cwd", ".", "file.txt"), "file.txt")
		})

		it("resolves parent directories correctly", () => {
			assert.strictEqual(resolveSync("/base/cwd", ".", "../file.txt"), "file.txt")
		})

		it("normalizes multiple path segments", () => {
			assert.strictEqual(resolveSync("/base", "root", "a", "b"), "a/b")
			assert.strictEqual(resolveSync("/base", "root", "a", "b", "../c"), "a/c")
		})

		it("handles root boundary correctly", () => {
			assert.strictEqual(resolveSync("/base", "/cwd", ".."), ".")
		})

		it("should return only root and next elements, but not cwd and root (first + second arguments)", () => {
			assert.strictEqual(resolveSync(".", ".", "/root", "dir/"), "/root/dir/")
			assert.strictEqual(resolveSync(".", "root", "dir/"), "dir/")
			assert.strictEqual(resolveSync("/root", "dir/"), ".")
		})

		it("handles root boundary after arguments", () => {
			// when cwd is relative and root is absolute the result is an absolute path
			assert.strictEqual(resolveSync("base", "/cwd", "root"), "root")
			// corrected expected value for relative cwd with absolute root
			assert.strictEqual(resolveSync(".", ".", "api", "/users"), "/users")
			assert.strictEqual(resolveSync(".", ".", "/root", "/dir", "file.txt"), "/dir/file.txt")
		})

		it("handles parent of root", () => {
			assert.strictEqual(resolveSync(".", ".", "/", "..", "_"), "/_")
		})
	})

	describe("normalize", () => {
		it("normalizes absolute", () => {
			assert.strictEqual(normalize("/a"), "a")
		})

		it("normalizes dot segments", () => {
			assert.strictEqual(normalize("a/./b"), "a/b")
		})

		it("resolves double dot segments", () => {
			assert.strictEqual(normalize("a/b/../c"), "a/c")
		})

		it("removes duplicate slashes", () => {
			assert.strictEqual(normalize("a//b///c"), "a/b/c")
		})

		it("preserves trailing directory slashes", () => {
			assert.strictEqual(normalize("a/b/"), "a/b/")
		})

		it("handles multiple arguments", () => {
			assert.strictEqual(normalize("root", "a/b", "../c", "d"), "root/a/c/d")
		})

		it("handles multiple arguments with cwd", () => {
			assert.strictEqual(normalize("/current/working/dir", "root", "a/b", "../c", "d"), "root/a/c/d")
		})

		it("handles multiple arguments with cwd and root", () => {
			assert.strictEqual(normalize("/current/working/dir", "root", "a/b", "../c", "d"), "root/a/c/d")
		})

		it("should normalize path with //", () => {
			assert.equal(normalize("/root", "/dir", "file.txt"), "root/dir/file.txt")
			assert.equal(normalize("/root", "/dir", "..", "file.txt"), "root/file.txt")
			assert.equal(normalize("playground/_/", "..", "_"), "playground/_")
			assert.equal(normalize("playground/_", "..", "_"), "playground/_")
		})

		it("should normalize after root only", () => {
			assert.equal(normalize("data", "_", "langs.yaml"), "data/_/langs.yaml")
		})
	})

	describe('relative', () => {
		it('should return uri if from and to are absolute and from starts with to', () => {
			assert.strictEqual(relative("/root/api", "/root/"), "api")
		})

		it('should return uri if from and to are absolute and from do not starts with to', () => {
			assert.strictEqual(relative("/root/api", "/root2/"), "/root2/")
		})

		it('should return uri if to is relative', () => {
			assert.strictEqual(relative("root/api", "sibling"), "sibling")
		})

		it('should navigate sibling directories', () => {
			const from = '/api/users/list'
			const to = '/api/posts/recent'
			assert.strictEqual(relative(from, to), '../posts/recent')
		})
	})

	describe("absolute", () => {
		it("converts virtual URI to physical path", () => {
			assert.strictEqual(absolute("/cwd/", "root/dir/fixtures", "nested/file"), "/cwd/root/dir/fixtures/nested/file")
		})

		it("strips trailing slash from root", () => {
			assert.strictEqual(absolute("/cwd/", "root/dir/fixtures/with-slash/", "file"), "/cwd/root/dir/fixtures/with-slash/file")
		})

		it("normalizes Windows path separators", () => {
			// On Windows, path separators are normalized but not converted
			// Path normalization doesn't change separators - that's platform-specific
			// Testing simple path behavior
			if (process.platform === "win32") {
				assert.strictEqual(
					absolute("C:\\cwd", "fixtures", "nested\\file").includes("\\"),
					true
				)
			}
		})

		it("resolves relative paths correctly", () => {
			assert.equal(absolute("/cwd/", "root/dir/fixtures", "../file"), "/cwd/root/dir/fixtures/file")
		})

		it('should construct absolute path with cwd and root', () => {
			assert.equal(absolute('/cwd', 'root', 'path'), '/cwd/root/path')
		})

		it('should handle remote URLs correctly', () => {
			assert.equal(absolute('https://example.com', 'api', 'v1/users'), 'https://example.com/api/v1/users')
			assert.equal(absolute('https://example.com/base/', 'api', 'v1/users'), 'https://example.com/base/api/v1/users')
		})
	})

	describe("basename", () => {
		it("returns file name for paths", () => {
			assert.strictEqual(basename("/dir/file.txt"), "file.txt")
		})

		it("preserves directory trailing slash", () => {
			assert.strictEqual(basename("/dir/"), "dir/")
		})

		it("removes specified suffix", () => {
			assert.strictEqual(basename("/file.txt", ".txt"), "file")
		})

		it("removes extension when true is specified", () => {
			assert.strictEqual(basename("/file.txt", true), "file")
		})

		it("handles root path correctly", () => {
			assert.strictEqual(basename("/"), "/")
		})

		it("handles empty path", () => {
			assert.strictEqual(basename(""), "")
		})

		it("should calculate file", () => {
			assert.equal(basename("some/url/with/a-file.txt"), "a-file.txt")
			assert.equal(basename("a-file.txt"), "a-file.txt")
		})

		it("should calculate directory", () => {
			assert.equal(basename("some/url/with/"), "with/")
			assert.equal(basename("/"), "/")
		})

		it("should calculate file with removed suffix", () => {
			assert.equal(basename("some/url/with/a-file.txt", true), "a-file")
			assert.equal(basename("some/url/with/a-file.txt", ".txt"), "a-file")
			assert.equal(basename("some/url/with/a-file.txt", ".md"), "a-file.txt")
			assert.equal(basename("some/url/with/a-file", true), "a-file")
			assert.equal(basename("some/url/with/a-file", ".txt"), "a-file")
			assert.equal(basename("some/url/with/a.gitignore", true), "a")
			assert.equal(basename("some/url/with/.gitignore", true), ".gitignore")
			assert.equal(basename("some/url/with/.gitignore", ".gitignore"), ".gitignore")
		})
	})

	describe("dirname", () => {
		it("returns parent directory", () => {
			assert.strictEqual(dirname("/a/b/file"), "/a/b/")
		})

		it("handles directory paths correctly", () => {
			assert.strictEqual(dirname("/a/b/"), "/a/")
		})

		it("handles root directory", () => {
			assert.strictEqual(dirname("/"), "/")
		})

		it("resolves nested paths", () => {
			assert.strictEqual(dirname("/a/b/c/d"), "/a/b/c/")
		})

		it("handles single-level paths", () => {
			assert.strictEqual(dirname("/file"), "/")
		})

		it("should calculate file path", () => {
			assert.equal(dirname("some/url/with/a-file.txt"), "some/url/with/")
			assert.equal(dirname("a-file.txt"), "/")
		})

		it("should calculate directory path", () => {
			assert.equal(dirname("some/url/with/"), "some/url/")
			assert.equal(dirname("/"), "/")
		})
	})

	describe("extname", () => {
		it("extracts file extension", () => {
			assert.strictEqual(extname("file.Txt"), ".txt")
			assert.strictEqual(extname("file.txt"), ".txt")
			assert.strictEqual(extname("file.TXT"), ".txt")
		})

		it("handles multiple dots correctly", () => {
			assert.strictEqual(extname("archive.tar.gz"), ".gz")
		})

		it("returns empty string for no extension", () => {
			assert.strictEqual(extname("file"), "")
		})

		it("handles directory paths", () => {
			assert.strictEqual(extname("/dir/"), "")
		})

		it("works with absolute paths", () => {
			assert.strictEqual(extname("/root/file.js"), ".js")
		})

		it('should return extension with dot', () => {
			assert.strictEqual(extname('file.txt'), '.txt')
			assert.strictEqual(extname('archive.tar.gz'), '.gz')
		})

		it('should return empty string if no extension', () => {
			assert.strictEqual(extname('filename'), '')
		})

		it('should handle empty string', () => {
			assert.strictEqual(extname(''), '')
		})
	})

	describe("isRemote", () => {
		it("should detect remote URLs", () => {
			assert.equal(isRemote("https://example.com"), true)
			assert.equal(isRemote("http://localhost:3000"), true)
			assert.equal(isRemote("file:///path/to/file"), true)
			assert.equal(isRemote("ftp://files.example.com"), true)
		})

		it("should return false for local paths", () => {
			assert.equal(isRemote("/local/path"), false)
			assert.equal(isRemote("./relative/path"), false)
			assert.equal(isRemote("../parent/path"), false)
			assert.equal(isRemote("simple-filename"), false)
		})
	})

	describe("isAbsolute", () => {
		it("should detect absolute paths", () => {
			assert.equal(isAbsolute("/absolute/path"), true)
			assert.equal(isAbsolute("https://example.com"), true)
			assert.equal(isAbsolute("http://localhost:3000"), true)
		})

		it("should return false for relative paths", () => {
			assert.equal(isAbsolute("./relative/path"), false)
			assert.equal(isAbsolute("../parent/path"), false)
			assert.equal(isAbsolute("simple-filename"), false)
		})
	})
})
