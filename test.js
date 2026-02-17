'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROCKYOU_PATH = path.join(__dirname, '..', 'output', 'ribbon-rockyou-v1.bin');

let passed = 0, failed = 0;

function test(name, fn) {
    try { fn(); passed++; console.log('  PASS  ' + name); }
    catch (e) { failed++; console.log('  FAIL  ' + name + '\n        ' + e.message); }
}

async function testAsync(name, fn) {
    try { await fn(); passed++; console.log('  PASS  ' + name); }
    catch (e) { failed++; console.log('  FAIL  ' + name + '\n        ' + e.message); }
}

// ─── Filter ───

const { RibbonFilter } = require('./lib/filter');

test('rejects invalid buffer', () => {
    const buf = Buffer.alloc(8192);
    buf.write('NOPE', 0, 'ascii');
    assert.throws(() => new RibbonFilter(buf), /magic/);
});

if (!fs.existsSync(ROCKYOU_PATH)) {
    console.log('\n  SKIP  Filter tests (download rockyou first)\n');
} else {
    const filter = new RibbonFilter(fs.readFileSync(ROCKYOU_PATH));

    test('check() finds breached passwords', () => {
        for (const pw of ['123456', 'password', 'iloveyou'])
            assert.strictEqual(filter.check(pw), true, pw);
    });

    test('check() rejects safe passwords', () => {
        assert.strictEqual(filter.check('xK9#mZ!pQ2$vR7&wL4@nT6'), false);
    });

    test('checkHash() works (upper and lower)', () => {
        const sha1 = crypto.createHash('sha1').update('password').digest('hex');
        assert.strictEqual(filter.checkHash(sha1.toUpperCase()), true);
        assert.strictEqual(filter.checkHash(sha1.toLowerCase()), true);
    });

    test('check() and checkHash() agree', () => {
        for (const pw of ['123456', 'password', 'xK9#mZ!pQ2$vR7&wL4@nT6']) {
            const sha1 = crypto.createHash('sha1').update(pw).digest('hex');
            assert.strictEqual(filter.check(pw), filter.checkHash(sha1), pw);
        }
    });

    test('meta', () => {
        const m = filter.meta;
        assert.strictEqual(m.version, 1);
        assert.strictEqual(m.fpBits, 7);
        assert.ok(m.totalKeys > 14000000);
    });

    filter.close();
}

// ─── load() ───

const hbf = require('./lib/index');

(async () => {
    if (fs.existsSync(ROCKYOU_PATH)) {
        await testAsync('load() and cache', async () => {
            const a = await hbf.load({ path: ROCKYOU_PATH });
            const b = await hbf.load({ path: ROCKYOU_PATH });
            assert.strictEqual(a, b);
            assert.strictEqual(a.check('password'), true);
        });
    }

    await testAsync('load() rejects missing file', async () => {
        await assert.rejects(() => hbf.load({ path: '/tmp/no-such-filter.bin' }), /not found/i);
    });

    console.log('\n' + (passed + failed) + ' tests: ' + passed + ' passed, ' + failed + ' failed\n');
    if (failed > 0) process.exit(1);
})();
