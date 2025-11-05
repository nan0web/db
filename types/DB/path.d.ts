/**
 * Public normalise – mimics the original behaviour where a leading cwd is
 * ignored when it is absolute and the next argument is relative. This matches
 * the expectations of the existing test‑suite.
 *
 * @param  {...string} args - Path segments
 * @returns {string} Normalised path (no leading slash)
 */
export function normalize(...args: string[]): string;
/**
 * Resolves path segments to a virtual‑space relative path.
 * Keeps the cwd unless the root is absolute (in which case cwd is ignored).
 *
 * @param {string} cwd  - Current working directory
 * @param {string} root - Root path for URI resolution (may be absolute)
 * @param  {...string} args - Path segments
 * @returns {string} Resolved relative path
 */
export function resolveSync(cwd: string, root: string, ...args: string[]): string;
/**
 * Returns base name of URI with the removedSuffix (if provided).
 * If `removeSuffix` is `true` the extension will be removed.
 *
 * @param {string} uri
 * @param {string|true} [removeSuffix] - Suffix to remove or true for extension
 * @returns {string}
 */
export function basename(uri: string, removeSuffix?: string | true | undefined): string;
/**
 * Returns directory name of URI.
 *
 * @param {string} uri
 * @returns {string}
 */
export function dirname(uri: string): string;
/**
 * Extract file extension (with leading dot) from URI.
 *
 * @param {string} uri
 * @returns {string} Extension (e.g. ".txt") or empty string
 */
export function extname(uri: string): string;
/**
 * Relative path resolver.
 *
 * Returns a path that navigates from `from` to `to`.
 * Handles file‑to‑file, file‑to‑directory and directory‑to‑directory cases.
 *
 * @param {string} from - Base path (file or directory)
 * @param {string} to   - Target path (file or directory)
 * @returns {string} Relative path
 */
export function relative(from: string, to: string): string;
/**
 * Get absolute path.
 *
 * @param {string} cwd  - Current working directory
 * @param {string} root - Root path
 * @param  {...string} args - Path segments
 * @returns {string} Absolute path (or URL when `cwd` is remote)
 */
export function absolute(cwd: string, root: string, ...args: string[]): string;
/**
 * Checks if `uri` has a scheme (http://, https://, ftp://, file://, …).
 *
 * @param {string} uri
 * @returns {boolean}
 */
export function isRemote(uri: string): boolean;
/**
 * Checks if `uri` is absolute (starts with `/`) or remote.
 *
 * @param {string} uri
 * @returns {boolean}
 */
export function isAbsolute(uri: string): boolean;
