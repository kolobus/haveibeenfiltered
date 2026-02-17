'use strict';

const crypto = require('crypto');
const { murmurhash3_x64_128 } = require('./murmurhash3');

const HEADER_SIZE = 5168;
const RIBBON_W = 64;
const HEX_CHARS = [48,49,50,51,52,53,54,55,56,57,65,66,67,68,69,70]; // '0'-'9','A'-'F'

class RibbonFilter {
    constructor(buffer) {
        this._buf = buffer;
        this.shardM = new Array(256);
        this.shardStartRange = new Array(256);
        this.shardOverflowCount = new Array(256);
        this.shardSolOffset = new Array(256);
        this.shardOvfOffset = new Array(256);
        this._keyBuf = Buffer.alloc(40);
        this._solBuf = Buffer.alloc(66); /* max readLen 64 + 2 sentinel bytes */
        this._readHeader();
    }

    _readHeader() {
        const buf = this._buf;

        const magic = buf.toString('ascii', 0, 4);
        if (magic !== 'RBBN') throw new Error('Not a ribbon filter file (magic: ' + magic + ')');

        this.version    = buf.readUInt32LE(4);
        this.numShards  = buf.readUInt32LE(8);
        this.ribbonW    = buf.readUInt32LE(12);
        this.hashSeed   = buf.readUInt32LE(16);
        this.fpBits     = buf.readUInt32LE(20);
        this.fpMask     = (1 << this.fpBits) - 1;
        this.totalKeys  = Number(buf.readBigUInt64LE(24));
        this.totalSolution = Number(buf.readBigUInt64LE(32));
        this.totalOverflow = Number(buf.readBigUInt64LE(40));

        /* Pre-compute BigInt constants */
        this._fpShift = BigInt(64 - this.fpBits);
        this._fpMaskBig = BigInt(this.fpMask);
        this._shardStartRangeBig = new Array(256);

        for (let i = 0; i < 256; i++) {
            this.shardM[i]             = Number(buf.readBigUInt64LE(48 + i * 8));
            this.shardStartRange[i]    = Number(buf.readBigUInt64LE(2096 + i * 8));
            this.shardOverflowCount[i] = buf.readUInt32LE(4144 + i * 4);
            this._shardStartRangeBig[i] = BigInt(this.shardStartRange[i]);
        }

        let offset = HEADER_SIZE;
        for (let i = 0; i < 256; i++) {
            this.shardSolOffset[i] = offset;
            const packedBytes = Math.ceil(this.shardM[i] * this.fpBits / 8);
            offset += packedBytes;
            this.shardOvfOffset[i] = offset;
            offset += this.shardOverflowCount[i] * 16;
        }
    }

    check(password) {
        const digest = crypto.createHash('sha1').update(password).digest();
        const shard = digest[0];
        const keyBuf = this._keyBuf;
        for (let i = 0; i < 20; i++) {
            keyBuf[i * 2]     = HEX_CHARS[digest[i] >> 4];
            keyBuf[i * 2 + 1] = HEX_CHARS[digest[i] & 0xf];
        }
        return this._query(shard, keyBuf);
    }

    checkHash(sha1hex) {
        const shard = parseInt(sha1hex.substring(0, 2), 16);
        const keyBuf = this._keyBuf;
        for (let i = 0; i < 40; i++) {
            let c = sha1hex.charCodeAt(i);
            if (c >= 97) c -= 32; /* a-f → A-F */
            keyBuf[i] = c;
        }
        return this._query(shard, keyBuf);
    }

    _query(shard, keyBuf) {
        const buf = this._buf;
        const m = this.shardM[shard];
        if (m === 0 || this.shardStartRange[shard] === 0) return false;

        const fpBits = this.fpBits;
        const fpMask = this.fpMask;

        const [h1, h2] = murmurhash3_x64_128(keyBuf, this.hashSeed);

        const start = Number(h1 % this._shardStartRangeBig[shard]);
        const coeff = h2 | 1n;
        const fp    = Number((h1 >> this._fpShift) & this._fpMaskBig);

        /* Split coeff into two 32-bit halves for fast inner loop */
        const coeffLo = Number(coeff & 0xFFFFFFFFn);
        const coeffHi = Number((coeff >> 32n) & 0xFFFFFFFFn);

        /* Copy packed solution bytes into reusable buffer */
        const firstBit   = start * fpBits;
        const firstByte  = Math.floor(firstBit / 8);
        const packedSize = Math.ceil(m * fpBits / 8);
        const readLen    = Math.min(64, packedSize - firstByte);
        const solOff     = this.shardSolOffset[shard] + firstByte;
        const solBuf     = this._solBuf;
        buf.copy(solBuf, 0, solOff, solOff + readLen);
        solBuf[readLen] = 0;     /* sentinel for 2-byte unpack at boundary */
        solBuf[readLen + 1] = 0;

        /* XOR unpacked values — two 32-bit loops instead of one BigInt loop */
        const startBitRem = firstBit & 7;
        let result = 0;

        let cLo = coeffLo;
        for (let pos = 0; pos < 32 && cLo !== 0; pos++) {
            if (cLo & 1) {
                const relBitOff = startBitRem + pos * fpBits;
                const byteIdx = relBitOff >> 3;
                const shift   = relBitOff & 7;
                result ^= ((solBuf[byteIdx] | (solBuf[byteIdx + 1] << 8)) >> shift) & fpMask;
            }
            cLo >>>= 1;
        }

        let cHi = coeffHi;
        for (let pos = 32; pos < RIBBON_W && cHi !== 0; pos++) {
            if (cHi & 1) {
                const relBitOff = startBitRem + pos * fpBits;
                const byteIdx = relBitOff >> 3;
                const shift   = relBitOff & 7;
                result ^= ((solBuf[byteIdx] | (solBuf[byteIdx + 1] << 8)) >> shift) & fpMask;
            }
            cHi >>>= 1;
        }

        if (result === fp) return true;

        /* Check overflow (bumped entries) */
        const nOvf = this.shardOverflowCount[shard];
        if (nOvf > 0) {
            const ovfOff = this.shardOvfOffset[shard];
            for (let i = 0; i < nOvf; i++) {
                const off = ovfOff + i * 16;
                const oCoeff = buf.readBigUInt64LE(off);
                const oStart = buf.readUInt32LE(off + 8);
                const oFp    = buf[off + 12];
                if (oStart === start && oCoeff === coeff && oFp === fp)
                    return true;
            }
        }

        return false;
    }

    get meta() {
        return {
            version: this.version,
            numShards: this.numShards,
            ribbonW: this.ribbonW,
            hashSeed: this.hashSeed,
            fpBits: this.fpBits,
            totalKeys: this.totalKeys,
            totalSolution: this.totalSolution,
            totalOverflow: this.totalOverflow,
        };
    }

    close() {
        this._buf = null;
    }
}

module.exports = { RibbonFilter };
