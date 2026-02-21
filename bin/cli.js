#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { RibbonFilter } = require('../lib/filter');
const { DATASETS } = require('../lib/datasets');
const { download } = require('../lib/download');

const BOOLEAN_FLAGS = new Set(['stdin', 'hash', 'json', 'quiet', 'force', 'help', 'version']);

function parseArgs(argv) {
    const args = Object.create(null);
    args._ = [];
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
            if (BOOLEAN_FLAGS.has(key)) {
                args[key] = true;
            } else {
                const next = argv[i + 1];
                if (next && !next.startsWith('--')) {
                    args[key] = next;
                    i++;
                } else {
                    args[key] = true;
                }
            }
        } else {
            args._.push(arg);
        }
    }
    return args;
}

function resolveDataset(name) {
    const ds = DATASETS[name];
    if (!ds) {
        console.error('Unknown dataset: ' + name + '. Available: ' + Object.keys(DATASETS).join(', '));
        process.exit(1);
    }
    return ds;
}

function resolveFilterPath(args) {
    if (args.path) return path.resolve(args.path);
    const dsName = args.dataset || 'hibp';
    const ds = resolveDataset(dsName);
    if (process.env.HAVEIBEENFILTERED_PATH) return path.resolve(process.env.HAVEIBEENFILTERED_PATH);
    return path.join(os.homedir(), '.haveibeenfiltered', ds.filename);
}

async function cmdDownload(args) {
    const dsName = args.dataset || 'hibp';
    const ds = resolveDataset(dsName);
    const filterPath = resolveFilterPath(args);

    if (fs.existsSync(filterPath)) {
        if (!args.force) {
            console.log(ds.name + ' filter already exists at ' + filterPath);
            console.log('Use --force to re-download.');
            return;
        }
        fs.unlinkSync(filterPath);
    }

    console.log('Downloading ' + ds.name + ' filter...');
    console.log('  URL: ' + ds.url);
    console.log('  Destination: ' + filterPath);
    console.log('  Expected size: ' + (ds.expectedBytes / 1048576).toFixed(1) + ' MB');
    console.log('  SHA-256: ' + ds.sha256);

    const tmpPath = filterPath + '.tmp';
    const onSigint = () => {
        process.stderr.write('\n');
        try { fs.unlinkSync(tmpPath); } catch (_) {}
        process.exit(130);
    };
    process.on('SIGINT', onSigint);

    let lastReported = -1;
    try {
        await download(ds.url, filterPath, {
            expectedBytes: ds.expectedBytes,
            sha256: ds.sha256,
            onProgress: process.stderr.isTTY ? ({ downloaded, total, percent }) => {
                const mb = (downloaded / 1048576).toFixed(1);
                const totalMb = (total / 1048576).toFixed(1);
                process.stderr.write('\r  ' + mb + ' / ' + totalMb + ' MB (' + percent + '%)');
            } : ({ downloaded, total, percent }) => {
                const step = percent - (percent % 10);
                if (step > lastReported) {
                    lastReported = step;
                    console.error('  ' + (downloaded / 1048576).toFixed(1) + ' / ' + (total / 1048576).toFixed(1) + ' MB (' + percent + '%)');
                }
            },
        });
    } finally {
        process.removeListener('SIGINT', onSigint);
    }
    console.log((process.stderr.isTTY ? '\n' : '') + 'Done. Integrity verified.');
}

function cmdStatus(args) {
    const dsName = args.dataset || 'hibp';
    const ds = resolveDataset(dsName);
    const filterPath = resolveFilterPath(args);

    if (!fs.existsSync(filterPath)) {
        console.log(ds.name + ': NOT DOWNLOADED');
        console.log('  Expected path: ' + filterPath);
        console.log('  Run: npx haveibeenfiltered download --dataset ' + dsName);
        return;
    }

    const stat = fs.statSync(filterPath);
    const buffer = fs.readFileSync(filterPath);
    const filter = new RibbonFilter(buffer);
    const meta = filter.meta;
    filter.close();

    console.log(ds.name + ': READY');
    console.log('  Path: ' + filterPath);
    console.log('  Size: ' + (stat.size / 1048576).toFixed(1) + ' MB (' + stat.size.toLocaleString() + ' bytes)');
    console.log('  Keys: ' + meta.totalKeys.toLocaleString());
    console.log('  Version: ' + meta.version);
    console.log('  FP bits: ' + meta.fpBits);
    console.log('  Shards: ' + meta.numShards);
}

async function cmdCheck(args) {
    const filterPath = resolveFilterPath(args);

    if (!fs.existsSync(filterPath)) {
        console.error('Filter not found: ' + filterPath);
        console.error('Run: npx haveibeenfiltered download --dataset ' + (args.dataset || 'hibp'));
        process.exit(1);
    }

    const buffer = fs.readFileSync(filterPath);
    const filter = new RibbonFilter(buffer);
    const useHash = !!args.hash;
    const useJson = !!args.json;
    const useQuiet = !!args.quiet;

    const lookup = useHash
        ? (v) => filter.checkHash(v)
        : (v) => filter.check(v);

    let anyFound = false;
    const inputs = [];

    if (args.stdin) {
        const rl = readline.createInterface({ input: process.stdin, terminal: false });
        for await (const line of rl) {
            const v = line.trim();
            if (v) inputs.push(v);
        }
    } else {
        if (args._.length === 0) {
            console.error('Usage: haveibeenfiltered check <password> [--hash] [--json] [--quiet]');
            process.exit(1);
        }
        inputs.push(...args._);
    }

    const results = [];
    for (const v of inputs) {
        const found = lookup(v);
        if (found) anyFound = true;
        results.push({ input: v, found });
    }

    if (useJson) {
        console.log(JSON.stringify(results.length === 1 ? results[0] : results));
    } else if (!useQuiet) {
        for (const r of results) {
            console.log(r.input + ': ' + (r.found ? 'FOUND' : 'NOT FOUND'));
        }
    }

    filter.close();
    if (useQuiet) process.exit(anyFound ? 1 : 0);
}

function usage() {
    console.log('Usage: haveibeenfiltered <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  download   Download filter data for a dataset');
    console.log('  status     Check if filter data is available');
    console.log('  check      Check password(s) against the filter');
    console.log('');
    console.log('Options:');
    console.log('  --dataset <name>   Dataset to use. Default: hibp');
    console.log('                     hibp        All HIBP passwords (1.79 GB, 2B keys)');
    console.log('                     hibp-min5   HIBP count >= 5   (725 MB, 812M keys)');
    console.log('                     hibp-min10  HIBP count >= 10  (435 MB, 487M keys)');
    console.log('                     hibp-min20  HIBP count >= 20  (259 MB, 290M keys)');
    console.log('                     rockyou     RockYou wordlist  (12.8 MB)');
    console.log('                     top1m       Top 1M passwords  (0.9 MB)');
    console.log('                     top10m      Top 10M passwords (9.0 MB)');
    console.log('  --path <path>      Custom path to filter file');
    console.log('  --force            Re-download even if file exists (download command)');
    console.log('  --stdin            Read input from stdin (check command)');
    console.log('  --hash             Input is SHA-1 hex, not plaintext (check command)');
    console.log('  --json             Output results as JSON (check command)');
    console.log('  --quiet            No output, exit code 1 if any found (check command)');
    console.log('  --help             Show this help message');
    console.log('  --version          Show version number');
    console.log('');
    console.log('Examples:');
    console.log('  npx haveibeenfiltered download --dataset rockyou');
    console.log('  npx haveibeenfiltered status');
    console.log('  npx haveibeenfiltered check password123');
    console.log('  npx haveibeenfiltered check --hash 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8');
    console.log('  npx haveibeenfiltered check --stdin < passwords.txt');
    console.log('  npx haveibeenfiltered check --stdin --hash < hashes.txt');
    console.log('  npx haveibeenfiltered check password123 --json');
    console.log('  npx haveibeenfiltered check password123 --quiet && echo "safe" || echo "breached"');
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    if (args.version) {
        const pkg = require('../package.json');
        console.log(pkg.version);
        return;
    }
    if (args.help) {
        usage();
        return;
    }

    const command = args._.shift();

    switch (command) {
        case 'download': return cmdDownload(args);
        case 'status':   return cmdStatus(args);
        case 'check':    return cmdCheck(args);
        default:
            usage();
            if (command) {
                console.error('\nUnknown command: ' + command);
                process.exit(1);
            }
    }
}

main().catch((err) => {
    console.error('Error: ' + err.message);
    process.exit(1);
});
