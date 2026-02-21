# Changelog

## [0.1.5] - 2026-02-22

### Added
- New datasets: `top1m` (top 1M most common passwords, 0.9 MB) and `top10m` (top 10M most common passwords, 9.0 MB)
- CLI help text now lists all available datasets with descriptions and sizes

## [0.1.4] - 2026-02-19

### Fixed
- `load()` accepts a string shorthand again (e.g. `load('rockyou')`)

## [0.1.3] - 2026-02-19

### Added
- New datasets: `hibp-min5`, `hibp-min10`, `hibp-min20` (HIBP passwords with 5+, 10+, 20+ breach occurrences)
- `--help` and `--version` CLI flags
- Non-TTY download progress (reports every 10%) for both CLI and library
- SIGINT handling during downloads (cleans up partial `.tmp` files)
- `.gitignore` for `node_modules/` and `*.tgz`
- CLI tests (`--version`, `--help`, unknown command, no args)
- Module API tests (exports shape, no CLI internals exposed)

### Fixed
- Download stream error handling: added WriteStream error listener, settled-state guard, and fd cleanup to prevent crashes on aborted downloads
- Library `autoDownload` progress now respects non-TTY environments (was always using `\r` overwrites)

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
