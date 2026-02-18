# Changelog

## [0.1.2] - 2026-02-18

### Changed
- Migrate CDN URL from `download.haveibeenfiltered.com` to `files.haveibeenfiltered.com/v0.1/`

## [0.1.1] - 2026-02-17

### Added
- `--force` flag for CLI download command to re-download existing files
- SECURITY.md with vulnerability reporting contact

### Fixed
- Download progress no longer spams output in non-TTY environments (pipes, CI)
- Download progress writes to stderr instead of stdout
- `close()` now properly invalidates cached filter instances from `load()`

## [0.1.0] - 2026-02-17

Initial release.
