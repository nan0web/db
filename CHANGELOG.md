# Changelog

All notable changes to this project will be documented in this file.

## [1.2.2] - 2026-02-13

### Fixed

- **Dependencies**: Added missing `@nan0web/log` dependency to `package.json` to resolve runtime errors in consuming packages.
- **Refactoring**: internal utility functions migrated to `@nan0web/types` (clone, merge, oneOf) for better type safety and consistency.
- **Logging**: Integrated `@nan0web/log` for standardized logging.
- **Code Style**: Enforced project-wide formatting standards (Tabs, No Semicolons) across all source files.

### Changed

- Updated `devDependencies` to use caret (`^`) versioning for better compatibility.
- Improved explicit typing in JSDoc signatures.
