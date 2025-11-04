# @nan0web/db Roadmap

## What can be improved in next minor release?

### Performance Optimizations
- **Caching improvements**: Better cache invalidation strategies and memory management
- **Index building**: Parallel processing for large directory trees during `buildIndexes()`
- **StreamEntry optimization**: Reduce object creation overhead in `findStream()` generator
- **Reference resolution**: Optimize circular reference detection and processing

### Developer Experience
- **Enhanced playground demos**: 
  - More extensive examples for auth driver
  - Database federation examples
  - Advanced merging scenarios
- **Better error messages**: Add more context to error messages including URI and operation details
- **Improved console output**: Add more detailed debug logging with structured data
- **Additional utility methods**: Helper methods for common operations like copy, rename

### API Extensions
- **Batch operations**: Add methods for batch get/set operations
- **Directory operations**: Enhanced directory management (mkdir, rmdir)
- **Watcher support**: Basic file watching capabilities for FS driver
- **Extended query support**: Pattern matching and glob support in find operations

### Testing Coverage
- **Driver protocol tests**: Complete test suite for default DBDriverProtocol behavior
- **Edge case coverage**: More tests for boundary conditions in data manipulation
- **Performance benchmarks**: Automated benchmarks for core operations
- **Integration tests**: Cross-driver compatibility tests

## What can be improved in next major release?

### Architectural Changes
- **Async-first design**: Make all operations properly asynchronous with better error handling
- **Plugin system**: Formal plugin architecture for extending functionality
- **Database federation**: Improved multi-database support with better query routing
- **Streaming-first approach**: Better streaming interfaces for large data operations

### Advanced Features
- **Query language**: Native query DSL for complex data retrieval
- **Transactions**: Support for atomic operations across multiple documents
- **Schema validation**: Built-in schema support with validation
- **Real-time synchronization**: Live update capabilities for connected databases
- **Compression**: Built-in data compression for storage efficiency

### Breaking API Changes
- **Simplified path resolution**: Streamlined URI handling with clearer semantics
- **Improved inheritance**: More flexible inheritance chains with better override capabilities
- **Revamped reference system**: Enhanced reference syntax with more powerful linking
- **Unified driver interface**: Cleaner abstraction for driver implementations

## Similar Databases and Their Pros/Cons

### Firebase Realtime Database
**Pros:**
- Real-time synchronization
- Simple JSON-based data model
- Built-in authentication
- SDKs for all platforms

**Cons:**
- Expensive at scale
- Limited querying capabilities
- No offline support in basic version
- Vendor lock-in

### CouchDB
**Pros:**
- HTTP-based API
- Multi-master replication
- Map/reduce views
- Good for offline-first apps

**Cons:**
- Steep learning curve
- Performance issues with large datasets
- Complex setup
- Limited real-time capabilities

### MongoDB
**Pros:**
- Flexible document model
- Rich query language
- Horizontal scaling
- Mature ecosystem

**Cons:**
- Complex deployment
- No built-in relations
- Can be memory-intensive
- Requires schema design expertise

### Redis
**Pros:**
- Extremely fast
- Rich data structures
- Simple deployment
- Pub/sub capabilities

**Cons:**
- Memory-based storage
- No query language
- Data persistence limitations
- Not suitable for complex documents

### PostgreSQL with JSONB
**Pros:**
- Strong consistency
- Powerful querying
- ACID compliance
- Mature and stable

**Cons:**
- Complex setup
- Overhead for simple operations
- Not designed for document-oriented workflows
- Scaling challenges
