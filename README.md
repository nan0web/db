# NaN0Web DB

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

- **DB**: Base database class with common operations
- **DocumentEntry**: Represents a document in the filesystem
- **DocumentStat**: Document metadata and statistics  
- **StreamEntry**: Progress-aware streaming interface
- **Data**: Powerful data manipulation utilities

## Use Cases

- Unified file management across local and remote systems
- Data synchronization between different storage backends
- Building custom database solutions
- Processing hierarchical data structures
- Implementing access-controlled data layers

You can see the other layers extending this abstraction:
- [nan0web/db-fs](https://nan0web.yaro.page/db-fs.html) - Database with a standard file management `node:fs`.
- [nan0web/db-fetch](https:/nan0web.yaro.page/db-fetch.html) - Database with a standard file management with `window.fetch`, for saving and deleting operations requires a server side for post and delete methods.

## LICENSE

- [ISC](./LICENSE)

## CONTRIBUTION

- [Join and contribute](./CONTRIBUTING.md)
