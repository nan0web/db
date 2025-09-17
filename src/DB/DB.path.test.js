import { suite, describe, it, beforeEach } from "node:test"
import assert from "node:assert/strict"
import DB from "./DB.js"

/**
 * @desc Comprehensive tests for DB URI/path resolution logic
 * Verified against trusted base DB implementation per Architecture Manifest
 */
suite("DB URI Core", () => {
	describe("resolveSync", () => {
		it("resolves relative paths within virtual space", () => {
			const db = new DB({ cwd: "/base/cwd/sub" })
			assert.strictEqual(db.resolveSync("file.txt"), "file.txt")
		})

		it("resolves parent directories correctly", () => {
			const db = new DB({ cwd: "/base/cwd/sub" })
			assert.strictEqual(db.resolveSync("../file.txt"), "file.txt")
		})

		it("normalizes multiple path segments", () => {
			const db = new DB({ root: "/base", cwd: "/base" })
			assert.strictEqual(db.resolveSync("a", "b", "../c"), "a/c")
		})

		it("handles root boundary correctly", () => {
			const db = new DB({ root: "/base", cwd: "/cwd" })
			assert.strictEqual(db.resolveSync(".."), "")
		})
	})

	describe("normalize", () => {
		it("normalizes dot segments", () => {
			const db = new DB()
			assert.strictEqual(db.normalize("a/./b"), "a/b")
		})

		it("resolves double dot segments", () => {
			const db = new DB()
			assert.strictEqual(db.normalize("a/b/../c"), "a/c")
		})

		it("removes duplicate slashes", () => {
			const db = new DB()
			assert.strictEqual(db.normalize("a//b///c"), "a/b/c")
		})

		it("preserves trailing directory slashes", () => {
			const db = new DB()
			assert.strictEqual(db.normalize("a/b/"), "a/b/")
		})

		it("handles multiple arguments", () => {
			const db = new DB()
			assert.strictEqual(db.normalize("root", "a/b", "../c", "d"), "root/a/c/d")
		})

		it("handles multiple arguments with cwd", () => {
			const db = new DB({ cwd: "/current/working/dir" })
			assert.strictEqual(db.normalize("root", "a/b", "../c", "d"), "root/a/c/d")
		})

		it("handles multiple arguments with cwd and root", () => {
			const db = new DB({ cwd: "/current/working/dir", root: "root" })
			assert.strictEqual(db.normalize("root", "a/b", "../c", "d"), "root/a/c/d")
		})

		it("should normalize path with //", () => {
			const db = new DB()
			assert.equal(db.normalize("/root", "/dir", "file.txt"), "/root/dir/file.txt")
			assert.equal(db.normalize("/root", "/dir", "..", "file.txt"), "/root/file.txt")
			assert.equal(db.normalize("playground/_/", "..", "_"), "playground/_")
			assert.equal(db.normalize("playground/_", "..", "_"), "playground/_")
		})

		it("should normalize after root only", () => {
			const db = new DB({ root: "data" })
			assert.equal(db.normalize("_", "langs.yaml"), "_/langs.yaml")
		})
	})

	describe("extract", () => {
		it("should handle empty root from extract", () => {
			const db = new DB({ cwd: "https://example.com", root: "." })
			const extracted = db.extract("content")
			assert.strictEqual(extracted.root, "content/")
			assert.strictEqual(extracted.resolveSync("page.json"), "page.json")
			assert.strictEqual(extracted.absolute("page.json"), "https://example.com/content/page.json")
		})

		it("should handle root normalization in extract", async () => {
			const db = new DB({
				cwd: "https://example.com",
				root: "content/",
				predefined: [
					["page1.json", { title: "Page 1" }],
					["blog/post1.json", { title: "Blog Post 1" }],
				]
			})
			await db.connect()
			const blogDb = db.extract("blog")

			assert.strictEqual(blogDb.root, "content/blog/")
			assert.deepStrictEqual(blogDb.data.get("post1.json"), { title: "Blog Post 1" })
			assert.strictEqual(blogDb.resolveSync("post1.json"), "post1.json")
			assert.strictEqual(blogDb.absolute("post1.json"), "https://example.com/content/blog/post1.json")
		})

		it("should handle multiple levels of extraction", async () => {
			const db = new DB({
				cwd: "https://example.com",
				root: "api",
				predefined: [
					["v1/users/john.json", { name: "John" }],
					["v1/users/mary.json", { name: "Mary" }],
				]
			})
			await db.connect()

			const apiV1Db = db.extract("v1")
			const usersDb = apiV1Db.extract("users")

			assert.strictEqual(usersDb.root, "api/v1/users/")
			const john = await usersDb.loadDocument("john.json")
			assert.deepStrictEqual(john, { name: "John" })
			const mary = await usersDb.loadDocument("mary.json")
			assert.deepStrictEqual(mary, { name: "Mary" })
			assert.strictEqual(usersDb.resolveSync("john.json"), "john.json")
			assert.strictEqual(usersDb.absolute("john.json"), "https://example.com/api/v1/users/john.json")
		})

		it("should preserve correct data structure after extraction", async () => {
			const db = new DB({
				cwd: "/var/www",
				root: "content",
				predefined: [
					["index.yaml", { title: "Home" }],
					["about.yaml", { title: "About" }],
					["blog/post1.yaml", { title: "First Post" }],
					["blog/post2.yaml", { title: "Second Post" }],
				]
			})
			await db.connect()

			const blogDb = db.extract("blog")
			assert.strictEqual(blogDb.root, "content/blog/")
			assert.deepStrictEqual(blogDb.data.get("post1.yaml"), { title: "First Post" })
			assert.deepStrictEqual(blogDb.data.get("post2.yaml"), { title: "Second Post" })

			assert.strictEqual(blogDb.normalize("post1.yaml"), "post1.yaml")
			assert.strictEqual(blogDb.resolveSync("post1.yaml"), "post1.yaml")
			assert.strictEqual(blogDb.absolute("post1.yaml"), "/var/www/content/blog/post1.yaml")

			// Перевірка метаданих
			assert.strictEqual(blogDb.meta.has("post1.yaml"), true)
		})

		it("should create isolated database with correct URI mapping", async () => {
			const db = new DB({
				cwd: "https://example.com",
				root: "private",
				predefined: [
					["user/profile.json", 100],
					["user/avatar.png", 2000],
					["admin/config.yaml", 50]
				]
			})
			await db.connect()

			const userDb = db.extract("user")

			// Перевіряємо, що ми витягнули тільки користувацькі дані
			assert.strictEqual(userDb.meta.has("profile.json"), true)
			assert.strictEqual(userDb.meta.has("avatar.png"), true)
			assert.strictEqual(userDb.meta.has("config.yaml"), false)

			// Перевіряємо права URI
			assert.strictEqual(userDb.resolveSync("profile.json"), "profile.json")
			assert.strictEqual(userDb.absolute("profile.json"), "https://example.com/private/user/profile.json")
		})

		it("should handle root with trailing slash in extract", () => {
			const db = new DB({
				cwd: "/var/www",
				root: "content/"
			})
			const extracted = db.extract("blog")
			assert.strictEqual(extracted.root, "content/blog/")
			assert.strictEqual(extracted.resolveSync("post1.json"), "post1.json")
			assert.strictEqual(extracted.absolute("post1.json"), "/var/www/content/blog/post1.json")
		})

		it("should handle extraction with dot notation", () => {
			const db = new DB({
				cwd: "/var/www",
				root: "."
			})
			const extracted = db.extract("content/blog")
			assert.strictEqual(extracted.root, "content/blog/")
			assert.strictEqual(extracted.resolveSync("a/post1.json"), "a/post1.json")
			assert.strictEqual(extracted.absolute("a/post1.json"), "/var/www/content/blog/a/post1.json")
		})

		it("should handle relative cwd in extract", () => {
			const db = new DB({
				cwd: "content",
				root: "."
			})
			const extracted = db.extract("blog")
			assert.strictEqual(extracted.root, "blog/")
			assert.strictEqual(extracted.resolveSync("post1.json"), "post1.json")
			assert.strictEqual(extracted.absolute("post1.json"), "/content/blog/post1.json")
		})

		it("should handle deep nested paths in extract", () => {
			const db = new DB({
				cwd: "https://example.com",
				root: "api/v1"
			})
			const extracted = db.extract("users/profiles")
			assert.strictEqual(extracted.root, "api/v1/users/profiles/")
			assert.strictEqual(extracted.resolveSync("alice.json"), "alice.json")
			assert.strictEqual(extracted.absolute("alice.json"), "https://example.com/api/v1/users/profiles/alice.json")
		})

		it("should correctly handle empty root extraction", () => {
			const db = new DB({ cwd: "https://example.com", root: "content" })
			const extracted = db.extract("")
			assert.strictEqual(extracted.root, "content/")
			assert.strictEqual(extracted.resolveSync("page.json"), "page.json")
			assert.strictEqual(extracted.absolute("page.json"), "https://example.com/content/page.json")
		})

		it('should create new DB with subset of data', async () => {
			const db = new DB({
				root: '/root',
				predefined: [
					['dir/file1.txt', 'content1'],
					['dir/file2.txt', 'content2'],
					['other.txt', 'other']
				]
			})
			await db.connect()

			const extracted = db.extract('dir/')
			const file1 = await extracted.loadDocument('file1.txt', "")
			const file2 = await extracted.fetch('file2.txt')
			assert.strictEqual(extracted.root, '/root/dir/')
			assert.strictEqual(extracted.data.size, 2)
			assert.strictEqual(extracted.meta.size, 3)
			assert.strictEqual(file1, "content1")
			assert.strictEqual(file2, "content2")
			assert.ok(extracted.data.has('file1.txt'))
			assert.ok(extracted.data.has('file2.txt'))
			assert.ok(!extracted.data.has('other.txt'))
		})
	})

	describe('relative', () => {
		/** @type {DB} */
		let db

		beforeEach(() => {
			db = new DB()
		})

		it('should return uri if from and to are absolute and from starts with to', async () => {
			const result = db.relative("/root/api", "/root/")
			assert.strictEqual(result, "api")
		})

		it('should return uri if from and to are absolute and from do not starts with to', async () => {
			const result = db.relative("/root/api", "/root2/")
			assert.strictEqual(result, "/root2/")
		})

		it('should return uri if to is relative', async () => {
			const result = db.relative("root/api", "/root2/")
			assert.strictEqual(result, "/root2/")
		})
	})

	describe("absolute", () => {
		/** @type {DB} */
		let db

		beforeEach(() => {
			db = new DB({ cwd: "/cwd/", root: "root/dir/fixtures" })
		})

		it("converts virtual URI to physical path", () => {
			const db = new DB({ cwd: "/cwd/", root: "root/dir/fixtures" })
			assert.strictEqual(db.absolute("nested/file"), "/cwd/root/dir/fixtures/nested/file")
		})

		it("strips trailing slash from root", () => {
			const db = new DB({ cwd: "/cwd/", root: "root/dir/fixtures/with-slash/" })
			assert.strictEqual(db.absolute("file"), "/cwd/root/dir/fixtures/with-slash/file")
		})

		it("normalizes Windows path separators", () => {
			if (process.platform === "win32") {
				db.root = "C:\\fixtures"
				assert.strictEqual(
					db.absolute("nested\\file").includes("\\"),
					true
				)
			}
		})

		it("resolves relative paths correctly", () => {
			const db = new DB({ cwd: "/cwd/", root: "root/dir/fixtures" })
			assert.equal(db.absolute("../file"), "/cwd/root/dir/file")
		})

		it('should throw not implemented error', () => {
			const db = new DB()
			const abs = db.absolute('path')

			assert.equal(abs, "/path")
		})
	})

	describe("basename", () => {
		/** @type {DB} */
		let db

		beforeEach(() => {
			db = new DB()
		})

		it("returns file name for paths", () => {
			assert.strictEqual(db.basename("/dir/file.txt"), "file.txt")
		})

		it("preserves directory trailing slash", () => {
			assert.strictEqual(db.basename("/dir/"), "dir/")
		})

		it("removes specified suffix", () => {
			assert.strictEqual(db.basename("/file.txt", ".txt"), "file")
		})

		it("removes extension when true is specified", () => {
			assert.strictEqual(db.basename("/file.txt", true), "file")
		})

		it("handles root path correctly", () => {
			assert.strictEqual(db.basename("/"), "/")
		})

		it("handles empty path", () => {
			assert.strictEqual(db.basename(""), "")
		})

		it("should calculate file", () => {
			assert.equal(db.basename("some/url/with/a-file.txt"), "a-file.txt")
			assert.equal(db.basename("a-file.txt"), "a-file.txt")
		})
		it("should calculate directory", () => {
			assert.equal(db.basename("some/url/with/"), "with/")
			assert.equal(db.basename("/"), "/")
		})
		it("should calculate file with removed suffix", () => {
			assert.equal(db.basename("some/url/with/a-file.txt", true), "a-file")
			assert.equal(db.basename("some/url/with/a-file.txt", ".txt"), "a-file")
			assert.equal(db.basename("some/url/with/a-file.txt", ".md"), "a-file.txt")
			assert.equal(db.basename("some/url/with/a-file", true), "a-file")
			assert.equal(db.basename("some/url/with/a-file", ".txt"), "a-file")
			assert.equal(db.basename("some/url/with/a.gitignore", true), "a")
			assert.equal(db.basename("some/url/with/.gitignore", true), ".gitignore")
			assert.equal(db.basename("some/url/with/.gitignore", ".gitignore"), ".gitignore")
		})
	})

	describe("dirname", () => {
		/** @type {DB} */
		let db

		beforeEach(() => {
			db = new DB()
		})

		it("returns parent directory", () => {
			assert.strictEqual(db.dirname("/a/b/file"), "/a/b/")
		})

		it("handles directory paths correctly", () => {
			assert.strictEqual(db.dirname("/a/b/"), "/a/")
		})

		it("handles root directory", () => {
			assert.strictEqual(db.dirname("/"), "/")
		})

		it("resolves nested paths", () => {
			assert.strictEqual(db.dirname("/a/b/c/d"), "/a/b/c/")
		})

		it("handles single-level paths", () => {
			assert.strictEqual(db.dirname("/file"), "/")
		})

		it("should calculate file path", () => {
			assert.equal(db.dirname("some/url/with/a-file.txt"), "some/url/with/")
			assert.equal(db.dirname("a-file.txt"), "/")
		})

		it("should calculate directory path", () => {
			assert.equal(db.dirname("some/url/with/"), "some/url/")
			assert.equal(db.dirname("/"), "/")
		})
	})

	describe("extname", () => {
		/** @type {DB} */
		let db

		beforeEach(() => {
			db = new DB()
		})

		it("extracts file extension", () => {
			assert.strictEqual(db.extname("file.Txt"), ".txt")
			assert.strictEqual(db.extname("file.txt"), ".txt")
			assert.strictEqual(db.extname("file.TXT"), ".txt")
		})

		it("handles multiple dots correctly", () => {
			assert.strictEqual(db.extname("archive.tar.gz"), ".gz")
		})

		it("returns empty string for no extension", () => {
			assert.strictEqual(db.extname("file"), "")
		})

		it("handles directory paths", () => {
			assert.strictEqual(db.extname("/dir/"), "")
		})

		it("works with absolute paths", () => {
			assert.strictEqual(db.extname("/root/file.js"), ".js")
		})

		it('should return extension with dot', () => {
			assert.strictEqual(db.extname('file.txt'), '.txt')
			assert.strictEqual(db.extname('archive.tar.gz'), '.gz')
		})

		it('should return empty string if no extension', () => {
			assert.strictEqual(db.extname('filename'), '')
		})

		it('should handle empty string', () => {
			assert.strictEqual(db.extname(''), '')
		})
	})

	describe("resolve", async () => {
		/** @type {DB} */
		let db

		beforeEach(() => {
			db = new DB()
		})

		it("should resolve the path", async () => {
			const path = await db.resolve("a/b", "c")
			assert.equal(path, "a/b/c")
		})
		it("should resolve / directories", async () => {
			const path = await db.resolve("api", "/users")
			assert.equal(path, "users")
		})
		it("should resolve .. directories", async () => {
			const path = await db.resolve("api/v1/", "../users")
			assert.equal(path, "api/users")
		})
		it("should resolve .. in 3 args", async () => {
			const path = await db.resolve("api/v1", "..", "users")
			assert.equal(path, "api/users")
		})
		it("should not resolve .. beyond root", async () => {
			// Test cases for ../ resolution behavior at root level
			const testCases = [
				{ args: ["/", "..", "_"], expected: "_" },
				{ args: ["/path", "..", "_"], expected: "_" },
				{ args: ["/deeply/nested/path", "..", "_"], expected: "deeply/nested/_" },
				{ args: ["_", "..", "_"], expected: "_" },
				{ args: ["playground/_", "..", "_"], expected: "playground/_" },
				{ args: ["/playground/_", "..", "_"], expected: "playground/_" },
			]

			for (const { args, expected } of testCases) {
				const result = await db.resolve(...args)
				assert.equal(result, expected, `Failed for args: ${JSON.stringify(args)}`)
			}
		})
		const expected = [
			[["private/test.txt"], "private/test.txt"],
			[["private", "test.txt"], "private/test.txt"],
			[["a", "b", "c.txt"], "a/b/c.txt"],
			[["../../", "var", "www"], "var/www"],
			[["."], "."],
			[["/", "404.json"], "404.json"],
			[["/root", "/dir", "file.txt"], "dir/file.txt"],
		]
		for (const [args, exp] of expected) {
			const db = new DB()
			it(`should resolve [${args}] => ${exp}`, async () => {
				const resolved = await db.resolve(...args)
				assert.equal(resolved, exp)
			})
		}
	})
})
