# NaN•Web DB

Every data is a database.  
Connect everything to a database: website, local data, ftp data.
Everything can be fetched, updated or deleting if you have access rights.

You can attach any friends (shared) database to your own as a branch, for instance `mnt/MyWebsite.com/pics`.  
And you can extract any of your branches to other databases `const extractedDb = db.extract("pics")`.

## Project Goals

- Provide a universal database abstraction layer for any data source
- Enable seamless integration between different data storage systems
- Simplify data manipulation with powerful utilities
- Support hierarchical data organization with branches
- Implement secure access control

## Features

- **Universal Interface**: Same API for filesystems, HTTP resources, and more
- **Branching**: Attach/detach databases as branches
- **Data Extraction**: Isolate subsets of data into new DB instances
- **Streaming Support**: Process large datasets efficiently
- **Access Control**: Fine-grained permissions (read/write/delete)
- **Data Utilities**: Flattening, unflattening, deep merging
- **Type Safety**: Full JSDoc annotations with TypeScript support
- **Progress Tracking**: Real-time progress monitoring for long operations
- **Inheritance Processing**: Merge global values and data from parent directories 
- **Reference Resolution**: Resolve references to other documents or their parts by URI
- **Directory Indexing**: Store and manage directory listings in various formats
- **Extensible Architecture**: Platform-specific implementations through inheritance

## API Overview

```js
import DB from '@nan0web/db'

// Create database instance
const db = new DB({ root: '/data' })

// Basic operations
await db.get('document.txt')
await db.set('document.txt', 'content')
await db.stat('document.txt')

// Branch management
const branch = db.extract('subfolder')
db.attach(externalDB)

// Streaming with progress
for await (const entry of db.findStream('*.txt', { 
	sort: 'size', 
	order: 'desc' 
})) {
	console.log(`Progress: ${entry.progress * 100}%`)
	console.log(entry.file.name)
}
```

## Core Classes

### DB (Base database class)
The foundation for all database operations with common functionality.
- `fetch(uri, opts)` – Load document with processing of inheritance, globals and references
- `get(uri, opts)` – Get document content with caching
- `set(uri, data)` – Set document content
- `stat(uri)` – Get document statistics with caching
- `loadDocument(uri, defaultValue)` – Load document from storage (platform-specific)
- `saveDocument(uri, document)` – Save document to storage (platform-specific)
- `statDocument(uri)` – Get document stats from storage (platform-specific)
- `dropDocument(uri)` – Delete document from storage (platform-specific)
- `ensureAccess(uri, level)` – Check access permissions for URI
- `connect()` – Connect to database (platform-specific)
- `disconnect()` – Disconnect from database
- `readDir(uri, options)` – Read directory contents as async generator
- `find(uri, depth)` – Find documents matching criteria
- `push(uri)` – Synchronize data with persistent storage
- `moveDocument(from, to)` – Move document between URIs
- `getInheritance(path)` – Get inherited data from parent directories
- `getGlobals(path)` – Get scoped variables from `_` directories
- `resolveReferences(data, basePath)` – Process all references recursively

### DocumentEntry
Represents a document in the database with metadata and path information.
- `name` – Document name
- `stat` – Document statistics (DocumentStat instance)
- `depth` – Directory depth level
- `path` – Full document path
- `parent` – Parent directory path
- `fulfilled` – Whether processing is complete
- `isDirectory`, `isFile`, `isSymbolicLink` – Type checking methods

### DocumentStat
Document metadata and statistics representation.
- `mtimeMs`, `atimeMs`, `ctimeMs`, `btimeMs` – Time statistics in milliseconds
- `size`, `mode`, `uid`, `gid` – File size and permissions
- `isFile`, `isDirectory`, `isSymbolicLink` – File type indicators
- `exists` – Check if document exists
- `error` – Error information if operation failed

### StreamEntry
Progress-aware streaming interface for directory operations.
- `file` – Current DocumentEntry
- `files` – All processed files
- `dirs` – Directory map
- `top` – Top-level directory map
- `errors` – Error map
- `progress` – Progress ratio (0-1)
- `totalSize` – Size statistics object

### Data
Powerful data manipulation utilities for object transformation.
- `flatten(obj)` – Flatten nested object into path-value pairs
- `unflatten(flat)` – Unflatten path-value pairs into nested object
- `merge(target, source)` – Deep merge objects
- `find(path, obj)` – Find value by path in an object
- `mergeFlat(target, source)` - Merge two arrays of flat path-value tuples
- `flatSiblings(flat, key)` - Get sibling entries of a specific path
- `getPathParents(path)` - List all parent paths of a given path

### Directory
Configuration for directory handling and naming conventions.
- `FILE` – Directory configuration file name (default: "_")
- `GLOBALS` – Global variables directory (default: "_/")
- `INDEX` – Index file name (default: "index")
- `DATA_EXTNAMES` – Supported data file extensions

### DirectoryIndex
Directory listing management with multiple storage formats.
- `entriesColumns` – Column definitions for indexed entries
- `entriesAs` – Storage format ("array", "object", "rows", "text")
- `maxEntriesOnLoad` – Maximum entries to load at once
- `encode(entries, target)` – Encode entries to specified format
- `decode(source, target)` – Decode entries from specified format

## Use Cases

- Unified file management across local and remote systems
- Data synchronization between different storage backends
- Building custom database solutions
- Processing hierarchical data structures
- Implementing access-controlled data layers

## Extensions

You can see the other layers extending this abstraction:
- [nan0web/db-fs](https://nan0web.yaro.page/db-fs.html) - Database with a standard file management `node:fs`.
- [nan0web/db-fetch](https:/nan0web.yaro.page/db-fetch.html) - Database with a standard file management with `window.fetch`, for saving and deleting operations requires a server side for post and delete methods.

## LICENSE

- [ISC](./LICENSE)

## CONTRIBUTION

- [Join and contribute](./CONTRIBUTING.md)
