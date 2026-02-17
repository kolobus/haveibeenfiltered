'use strict';

const MASK64 = (1n << 64n) - 1n;

function rotl64(x, r) {
    const br = BigInt(r);
    return ((x << br) | (x >> (64n - br))) & MASK64;
}

function fmix64(k) {
    k ^= k >> 33n;
    k = (k * 0xff51afd7ed558ccdn) & MASK64;
    k ^= k >> 33n;
    k = (k * 0xc4ceb9fe1a85ec53n) & MASK64;
    k ^= k >> 33n;
    return k;
}

function murmurhash3_x64_128(buf, seed) {
    const len = buf.length;
    const nblocks = Math.floor(len / 16);

    let h1 = BigInt(seed);
    let h2 = BigInt(seed);

    const c1 = 0x87c37b91114253d5n;
    const c2 = 0x4cf5ad432745937fn;

    for (let i = 0; i < nblocks; i++) {
        let k1 = buf.readBigUInt64LE(i * 16);
        let k2 = buf.readBigUInt64LE(i * 16 + 8);

        k1 = (k1 * c1) & MASK64; k1 = rotl64(k1, 31); k1 = (k1 * c2) & MASK64;
        h1 ^= k1;
        h1 = rotl64(h1, 27); h1 = (h1 + h2) & MASK64; h1 = (h1 * 5n + 0x52dce729n) & MASK64;

        k2 = (k2 * c2) & MASK64; k2 = rotl64(k2, 33); k2 = (k2 * c1) & MASK64;
        h2 ^= k2;
        h2 = rotl64(h2, 31); h2 = (h2 + h1) & MASK64; h2 = (h2 * 5n + 0x38495ab5n) & MASK64;
    }

    const tailOff = nblocks * 16;
    const tlen = len & 15;
    let k1 = 0n, k2 = 0n;

    if (tlen > 8) {
        for (let i = tlen - 1; i >= 8; i--)
            k2 ^= BigInt(buf[tailOff + i]) << (BigInt(i - 8) * 8n);
        k2 = (k2 * c2) & MASK64; k2 = rotl64(k2, 33); k2 = (k2 * c1) & MASK64;
        h2 ^= k2;
    }

    if (tlen > 0) {
        const end = Math.min(tlen - 1, 7);
        for (let i = end; i >= 0; i--)
            k1 ^= BigInt(buf[tailOff + i]) << (BigInt(i) * 8n);
        k1 = (k1 * c1) & MASK64; k1 = rotl64(k1, 31); k1 = (k1 * c2) & MASK64;
        h1 ^= k1;
    }

    h1 ^= BigInt(len); h2 ^= BigInt(len);
    h1 = (h1 + h2) & MASK64; h2 = (h2 + h1) & MASK64;
    h1 = fmix64(h1); h2 = fmix64(h2);
    h1 = (h1 + h2) & MASK64; h2 = (h2 + h1) & MASK64;

    return [h1, h2];
}

module.exports = { murmurhash3_x64_128 };
