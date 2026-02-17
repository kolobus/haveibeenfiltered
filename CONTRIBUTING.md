# Contributing to haveibeenfiltered

Thanks for your interest in contributing!

## Reporting Issues

- Use [GitHub Issues](https://github.com/kolobus/haveibeenfiltered/issues)
- Include Node.js version, OS, and steps to reproduce
- For security vulnerabilities, email mihail@fedorov.net directly

## Development

```bash
git clone https://github.com/kolobus/haveibeenfiltered.git
cd haveibeenfiltered
```

No install step needed — zero dependencies.

### Testing

Download a test filter first:

```bash
node bin/cli.js download --dataset rockyou
```

Then run the test suite:

```bash
npm test
```

### Code Style

- No external dependencies — Node.js builtins only
- No transpilation — plain CommonJS
- Keep it simple — this is a focused library

## Pull Requests

1. Fork the repo and create your branch from `main`
2. Add tests if you've added code
3. Ensure `npm test` passes
4. Submit your PR

## Adding a New Dataset

1. Build the ribbon filter `.bin` file
2. Upload to CDN (`https://download.haveibeenfiltered.com/`)
3. Compute SHA-256: `sha256sum your-filter.bin`
4. Add entry to `lib/datasets.js`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
