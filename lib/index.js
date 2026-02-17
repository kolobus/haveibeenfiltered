'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { RibbonFilter } = require('./filter');
const { DATASETS } = require('./datasets');
const { download } = require('./download');

const _cache = Object.create(null);

function resolveDataset(name) {
    const ds = DATASETS[name];
    if (!ds) throw new Error('Unknown dataset: ' + name + '. Available: ' + Object.keys(DATASETS).join(', '));
    return ds;
}

function defaultDir() {
    return path.join(os.homedir(), '.haveibeenfiltered');
}

async function load(opts) {
    opts = opts || {};
    const datasetName = opts.dataset || 'hibp';
    const ds = resolveDataset(datasetName);
    const autoDownload = opts.autoDownload === true;

    // Resolve filter path
    let filterPath;
    if (opts.path) {
        filterPath = path.resolve(opts.path);
    } else if (process.env.HAVEIBEENFILTERED_PATH) {
        filterPath = path.resolve(process.env.HAVEIBEENFILTERED_PATH);
    } else {
        filterPath = path.join(defaultDir(), ds.filename);
    }

    // Return cached filter if already loaded
    if (_cache[filterPath]) return _cache[filterPath];

    // Check if file exists
    if (!fs.existsSync(filterPath)) {
        if (!autoDownload) {
            throw new Error('Filter not found: ' + filterPath + '. Download it first:\n  npx haveibeenfiltered download --dataset ' + datasetName);
        }
        // Download from CDN
        process.stderr.write('Downloading ' + ds.name + ' filter to ' + filterPath + '...\n');
        await download(ds.url, filterPath, {
            expectedBytes: ds.expectedBytes,
            sha256: ds.sha256,
            onProgress: ({ percent }) => {
                process.stderr.write('\r  ' + percent + '%');
            },
        });
        process.stderr.write('\n');
    }

    const buffer = fs.readFileSync(filterPath);
    const filter = new RibbonFilter(buffer);
    const origClose = filter.close;
    filter.close = function() { delete _cache[filterPath]; origClose.call(this); };
    _cache[filterPath] = filter;
    return filter;
}

module.exports = { load };
