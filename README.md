# haveibeenfiltered

[![npm version](https://img.shields.io/npm/v/haveibeenfiltered.svg)](https://www.npmjs.com/package/haveibeenfiltered)
[![license](https://img.shields.io/npm/l/haveibeenfiltered.svg)](https://github.com/kolobus/haveibeenfiltered/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/haveibeenfiltered.svg)](https://nodejs.org)

Offline password breach checking using [ribbon filters](https://engineering.fb.com/2021/07/09/core-infra/ribbon-filter/). Check passwords against the [Have I Been Pwned](https://haveibeenpwned.com/) dataset (2B+ passwords) locally, with no API calls.

See [haveibeenfiltered.com](https://haveibeenfiltered.com) for more information about the project.

## Why?

| Approach | Speed | Privacy | Offline | Size |
|----------|-------|---------|---------|------|
| HIBP API | ~200ms/req | Partial (k-anonymity) | No | 0 |
| Full hash DB | Fast | Full | Yes | 30+ GB |
| **haveibeenfiltered** | **~14 microseconds** | **Full** | **Yes** | **1.8 GB** |

A ribbon filter compresses 2 billion SHA-1 hashes into 1.8 GB with a ~0.78% false positive rate and **zero false negatives**. Smaller filtered subsets are available for constrained environments.

## Quick Start

### Install

```bash
npm install haveibeenfiltered
```

### Download the filter data

```bash
npx haveibeenfiltered download
```

This downloads the HIBP dataset (~1.8 GB) to `~/.haveibeenfiltered/` with SHA-256 integrity verification.

For a smaller dataset to try first:

```bash
npx haveibeenfiltered download --dataset rockyou
```

### Use in your app

```js
const hbf = require('haveibeenfiltered')

const filter = await hbf.load({ dataset: 'rockyou' })

filter.check('password123')  // true  — breached!
filter.check('Tr0ub4dor&3')  // false — not found
```

## API

### `hbf.load(options?)`

Loads a ribbon filter and returns a `RibbonFilter` instance.

```js
// Default dataset (HIBP)
const filter = await hbf.load()

// Specific dataset
const filter = await hbf.load({ dataset: 'rockyou' })

// Custom file path
const filter = await hbf.load({ path: '/opt/data/ribbon-hibp-v1.bin' })

// Auto-download if missing (opt-in)
const filter = await hbf.load({ autoDownload: true })
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dataset` | `string` | `'hibp'` | Dataset name (`hibp`, `hibp-min5`, `hibp-min10`, `hibp-min20`, `rockyou`) |
| `path` | `string` | — | Explicit path to `.bin` file |
| `autoDownload` | `boolean` | `false` | Download from CDN if file is missing |

**Path resolution order:**

1. `opts.path` — explicit path
2. `$HAVEIBEENFILTERED_PATH` — environment variable
3. `~/.haveibeenfiltered/<filename>` — default directory

### `filter.check(password)`

Check a plaintext password. Returns `true` if found in the breach dataset.

```js
filter.check('password123')  // true
filter.check('correcthorsebatterystaple')  // depends on dataset
```

### `filter.checkHash(sha1hex)`

Check a pre-computed SHA-1 hash (hex string, case-insensitive).

```js
filter.checkHash('5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8')  // true ("password")
filter.checkHash('5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8')  // also works
```

### `filter.meta`

Returns filter metadata.

```js
filter.meta
// {
//   version: 1,
//   totalKeys: 2048908128,
//   fpBits: 7,
//   numShards: 256,
//   ...
// }
```

### `filter.close()`

Releases the in-memory buffer. Call when done.

## CLI

```bash
npx haveibeenfiltered <command> [options]
```

### Download filter data

```bash
# Download HIBP dataset (~1.8 GB)
npx haveibeenfiltered download

# Download RockYou dataset (~13 MB)
npx haveibeenfiltered download --dataset rockyou

# Re-download (overwrite existing file)
npx haveibeenfiltered download --force
```

### Check passwords

```bash
# Check a single password
npx haveibeenfiltered check password123

# Check multiple passwords
npx haveibeenfiltered check password 123456 iloveyou

# Check from stdin (batch mode)
cat passwords.txt | npx haveibeenfiltered check --stdin

# Check pre-computed SHA-1 hashes
npx haveibeenfiltered check --hash 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8

# Batch hash checking
cat sha1-hashes.txt | npx haveibeenfiltered check --stdin --hash
```

### Output formats

```bash
# Default: human-readable
npx haveibeenfiltered check password123
# password123: FOUND

# JSON output
npx haveibeenfiltered check password123 --json
# {"input":"password123","found":true}

# Quiet mode (exit code only — 1 if found, 0 if not)
npx haveibeenfiltered check password123 --quiet && echo "safe" || echo "breached"
```

### Check status

```bash
npx haveibeenfiltered status
# hibp: READY
#   Path: /home/user/.haveibeenfiltered/ribbon-hibp-v1.bin
#   Size: 1830.9 MB (1,918,974,105 bytes)
#   Keys: 2,048,908,128
#   Version: 1
#   FP bits: 7
#   Shards: 256
```

## Datasets

| Dataset | Passwords | Filter Size | FP Rate | Description |
|---------|-----------|-------------|---------|-------------|
| `hibp` | 2,048,908,128 | 1.8 GB | ~0.78% | [Have I Been Pwned](https://haveibeenpwned.com/) — all passwords |
| `hibp-min5` | 812,290,707 | 726 MB | ~0.78% | HIBP — passwords seen in 5+ breaches |
| `hibp-min10` | 486,611,978 | 435 MB | ~0.78% | HIBP — passwords seen in 10+ breaches |
| `hibp-min20` | 290,029,936 | 259 MB | ~0.78% | HIBP — passwords seen in 20+ breaches |
| `rockyou` | 14,344,391 | 12.8 MB | ~0.78% | [RockYou](https://en.wikipedia.org/wiki/RockYou#Data_breach) breach (2009) |

### CDN

Filter binaries are hosted at `https://files.haveibeenfiltered.com/v0.1/`:

| File | Size | SHA-256 |
|------|------|---------|
| [`ribbon-hibp-v1.bin`](https://files.haveibeenfiltered.com/v0.1/ribbon-hibp-v1.bin) | 1.8 GB | `4eeb8608fa8541a51a952ecda91ad2f86e6f7457b0dbe34b88ba8a7ed33750ce` |
| [`ribbon-hibp-v1-min5.bin`](https://files.haveibeenfiltered.com/v0.1/ribbon-hibp-v1-min5.bin) | 726 MB | `4422f5659cb5fe39cf284b844328bfd3f7ab37fac0fe649b4cff216ffd2ac5da` |
| [`ribbon-hibp-v1-min10.bin`](https://files.haveibeenfiltered.com/v0.1/ribbon-hibp-v1-min10.bin) | 435 MB | `8c71d6a3696d27bcf21a30ddcd67f7e290a71210800db86810ffb84a426fe93e` |
| [`ribbon-hibp-v1-min20.bin`](https://files.haveibeenfiltered.com/v0.1/ribbon-hibp-v1-min20.bin) | 259 MB | `31a2c7942698fce74d95ce54dfb61f383ef1a33dce496b88c672e1ac07c71c43` |
| [`ribbon-rockyou-v1.bin`](https://files.haveibeenfiltered.com/v0.1/ribbon-rockyou-v1.bin) | 12.8 MB | `777d3c1640e7067bc7fb222488199c3371de5360639561f1f082db6b7c16a447` |

The CLI downloads to `~/.haveibeenfiltered/` by default. Integrity is verified via SHA-256 after each download.

### False Positives and False Negatives

A ribbon filter is a probabilistic data structure. It has two possible error types:

- **False positive (FP):** A safe password is incorrectly reported as breached. This can happen because the filter stores compressed fingerprints, not exact hashes. The filter uses 7-bit fingerprints, giving a rate of 1/128 (~0.78%).
- **False negative (FN):** A breached password is missed and reported as safe. **This cannot happen.** If a password is in the dataset, the filter will always detect it.

In practice this means: if `check()` returns `false`, the password is **definitely not** in the dataset. If it returns `true`, there is a ~0.78% chance it's a false alarm. For security applications this is the right tradeoff — you never miss a breached password.

## How It Works

haveibeenfiltered uses [ribbon filters](https://engineering.fb.com/2021/07/09/core-infra/ribbon-filter/), a space-efficient probabilistic data structure (similar to Bloom filters but ~20% smaller).

1. **Build** — All 2B+ password SHA-1 hashes are inserted into a ribbon filter, sharded by the first byte (256 shards)
2. **Query** — Your password is SHA-1 hashed, then checked against the filter using MurmurHash3 for the internal lookup
3. **Result** — `true` means definitely breached (or ~0.78% chance of false positive). `false` means definitely not in the dataset.

The filter data is stored as a single binary file with a custom format (magic: `RBBN`), containing bit-packed solution vectors and overflow tables per shard.

## Security

- All checking is local — passwords never leave your machine
- Downloads are SHA-256 verified
- HTTPS only — redirects are refused
- Zero npm dependencies — only Node.js builtins

## Performance

| Operation | Time | Throughput |
|-----------|------|------------|
| `check(password)` | ~14 us | ~72,000/sec |
| `checkHash(sha1hex)` | ~8 us | ~121,000/sec |

Benchmarked on a single core. The filter loads into memory once (~1.8 GB RAM for HIBP) and all subsequent lookups are in-memory.

## Requirements

- **Node.js** >= 16.0.0
- **Disk space** — 1.8 GB for HIBP (full), 726 MB (min5), 435 MB (min10), 259 MB (min20), 13 MB for RockYou
- **RAM** — same as disk (filter is loaded into memory)

## Links

- [haveibeenfiltered.com](https://haveibeenfiltered.com) — Project homepage
- [GitHub](https://github.com/kolobus/haveibeenfiltered) — Source code
- [npm](https://www.npmjs.com/package/haveibeenfiltered) — Package registry
- [Have I Been Pwned](https://haveibeenpwned.com/) — Password breach data source
- [Buy Me a Coffee](https://buymeacoffee.com/kolobus) — Support the project

## License

[MIT](LICENSE)
