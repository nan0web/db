# v1.0.0 - 2025-08-24

Initial version of agnostic database with its basic useful functionality.

## Document operations

### Load documents [load-documents.test.js]

Agnostic document loading with support for multiple data formats.

#### AC
- Should load documents as text, buffer[], objects.
- Should handle different file extensions (.json, .yaml, .yml, .nano, .html, .xml).
- Should return default value when document is not found.
- Should cache loaded documents for performance.
- Should support platform-specific loading implementations.

### Save documents [save-documents.test.js]

Universal document saving interface with metadata management.

#### AC
- Should save document data to storage.
- Should update metadata (mtime, size) after save.
- Should support platform-specific saving implementations.
- Should handle different data types (text, objects, arrays).
- Should return success status.

### Delete documents [delete-documents.test.js]

Secure document deletion with access control verification.

#### AC
- Should verify delete access permissions.
- Should remove document from storage.
- Should clear cached data and metadata.
- Should support platform-specific deletion implementations.
- Should return success status.

### Move documents [move-documents.test.js]

Atomic document relocation with full metadata preservation.

#### AC
- Should verify read access for source document.
- Should verify write access for destination.
- Should load document from source location.
- Should save document to destination location.
- Should preserve all document metadata during move.

### Get document statistics [document-stat.test.js]

Retrieve comprehensive metadata for any document or directory.

#### AC
- Should return DocumentStat instance with all metadata fields.
- Should handle missing documents gracefully.
- Should cache statistics for performance.
- Should support platform-specific stat implementations.
- Should calculate exists property correctly.

### Fetch merged documents [fetch-merged.test.js]

Intelligent document loading with inheritance, globals and references processing.

#### AC
- Should merge parent directory data with document data.
- Should include global variables from _/ directories.
- Should resolve internal and external document references.
- Should handle missing parent or reference documents.
- Should return complete merged document structure.

## Data operations

### Flatten/Unflatten objects [flatten-unflatten.test.js]

Convert nested objects into flat path-value pairs and vice versa.

#### AC
- Should flatten nested objects into path-value pairs.
- Should unflatten path-value pairs into nested objects.
- Should handle arrays correctly during flattening/unflattening.
- Should support custom object divider configuration.
- Should support custom array wrapper configuration.

### Deep merge objects [deep-merge.test.js]

Recursively merge objects with array replacement support.

#### AC
- Should deep merge nested objects.
- Should replace arrays instead of merging them.
- Should handle empty objects correctly.
- Should preserve target object structure.
- Should create new merged object without mutation.

### Find values in objects [find-values.test.js]

Retrieve values from nested objects using path strings.

#### AC
- Should find values by path in nested objects.
- Should return undefined for missing paths.
- Should handle array indices in paths.
- Should support maximum depth traversal.
- Should work with both string and array path formats.

### Merge flat data [merge-flat.test.js]

Combine flat path-value arrays with reference handling.

#### AC
- Should merge flat data arrays while preserving order.
- Should handle $ref objects by expanding properties.
- Should support custom reference key configuration.
- Should sort merged entries alphabetically.
- Should override existing entries with new values.

### Get flat siblings [flat-siblings.test.js]

Retrieve related entries at the same hierarchy level.

#### AC
- Should return flat sibling entries for a given key.
- Should exclude the key itself from siblings.
- Should handle top-level and nested keys correctly.
- Should work with both array and object input formats.
- Should return empty array when no siblings exist.

## Directory operations

### Read directory structure [read-directory.test.js]

Traverse directory hierarchies with configurable depth and filtering.

#### AC
- Should read directory contents as async generator.
- Should respect depth limits during traversal.
- Should apply filters to exclude unwanted entries.
- Should handle symbolic links according to options.
- Should prevent directory traversal cycles.
- Should yield DocumentEntry instances with proper metadata.

### Directory indexing [directory-indexing.test.js]

Store and manage directory listings in multiple formats.

#### AC
- Should encode directory entries as arrays, rows, or text.
- Should decode directory entries back to original format.
- Should support different column formats (name, mtime, size).
- Should handle radix conversion for numeric values.
- Should validate column configuration requirements.
- Should maintain sort order during encoding/decoding.

### Branch extraction [branch-extraction.test.js]

Create isolated database instances from directory branches.

#### AC
- Should create new DB instance with subset data.
- Should maintain relative paths within extracted branch.
- Should preserve document metadata in extraction.
- Should exclude entries outside the specified URI prefix.
- Should handle edge cases (empty directory, missing data).

### Database attachment [database-attachment.test.js]

Connect external databases as hierarchical branches.

#### AC
- Should attach DB instances as branches.
- Should verify attached instance is of DB type.
- Should provide bidirectional access to attached branches.
- Should handle multiple database attachments.
- Should support detachment of previously attached databases.

### Stream directory contents [find-stream.test.js]

Progress-aware directory traversal with filtering and sorting.

#### AC
- Should yield StreamEntry instances with progress tracking.
- Should support filtering by patterns or custom functions.
- Should handle limit constraints on returned entries.
- Should support sorting by name, modification time, or size.
- Should track directory fulfillment status during streaming.
- Should validate symbolic links and visited entries to prevent infinite loops.

### Resolve paths [path-resolution.test.js]

Convert relative paths to absolute paths with proper normalization.

#### AC
- Should resolve relative paths to absolute database paths.
- Should normalize path segments (handle .. and . correctly).
- Should join multiple path segments properly.
- Should return consistent paths across different platforms.
- Should handle root directory references correctly.

### Ensure access permissions [access-control.test.js]

Verify access rights for database operations with granular control.

#### AC
- Should validate access levels (read, write, delete).
- Should check permissions for specific document URIs.
- Should throw descriptive errors for invalid access requests.
- Should handle platform-specific access control implementations.
- Should support different access modes for various operations.

### Synchronize database state [sync-state.test.js]

Maintain consistency between memory cache and persistent storage.

#### AC
- Should compare modification times to detect changes.
- Should save modified documents to persistent storage.
- Should return list of synchronized URIs.
- Should handle partial synchronization for specific documents.
- Should respect access permissions during synchronization.
