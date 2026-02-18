'use strict';

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const MAX_DOWNLOAD_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB absolute cap

function download(url, destPath, opts) {
    opts = opts || {};
    const onProgress = opts.onProgress || null;
    const expectedBytes = opts.expectedBytes || 0;
    const expectedSha256 = opts.sha256 || null;

    if (!url.startsWith('https://')) {
        return Promise.reject(new Error('Refusing non-HTTPS download URL: ' + url));
    }

    const sizeLimit = expectedBytes > 0 ? expectedBytes + 1024 : MAX_DOWNLOAD_BYTES;

    return new Promise((resolve, reject) => {
        const dir = path.dirname(destPath);
        fs.mkdirSync(dir, { recursive: true });

        const tmpPath = destPath + '.tmp';
        const file = fs.createWriteStream(tmpPath);

        let done = false;
        function cleanup(err) {
            if (done) return;
            done = true;
            file.destroy();
            try { fs.unlinkSync(tmpPath); } catch (_) {}
            reject(err);
        }

        file.on('error', cleanup);

        https.get(url, (res) => {
            /* Refuse redirects — the CDN URL must resolve directly */
            if (res.statusCode >= 300 && res.statusCode < 400) {
                res.resume();
                cleanup(new Error('Download refused redirect (HTTP ' + res.statusCode + ' → ' + (res.headers.location || '?') + '). Update the dataset URL.'));
                return;
            }

            if (res.statusCode !== 200) {
                res.resume();
                cleanup(new Error('Download failed: HTTP ' + res.statusCode));
                return;
            }

            /* Check Content-Length against expected size if available */
            const contentLength = parseInt(res.headers['content-length'], 10) || 0;
            if (expectedBytes > 0 && contentLength > 0 && contentLength !== expectedBytes) {
                res.resume();
                cleanup(new Error('Content-Length mismatch: expected ' + expectedBytes + ' bytes, server reports ' + contentLength));
                return;
            }

            let downloaded = 0;

            res.on('data', (chunk) => {
                downloaded += chunk.length;
                if (downloaded > sizeLimit) {
                    res.destroy();
                    cleanup(new Error('Download exceeded size limit (' + sizeLimit + ' bytes). Aborting.'));
                    return;
                }
                if (onProgress && contentLength > 0) {
                    onProgress({
                        downloaded,
                        total: contentLength,
                        percent: Math.round(downloaded / contentLength * 100),
                    });
                }
            });

            res.pipe(file);

            file.on('finish', () => {
                file.close(() => {
                    /* Validate file size */
                    const stat = fs.statSync(tmpPath);
                    if (expectedBytes > 0 && stat.size !== expectedBytes) {
                        cleanup(new Error('Downloaded file size mismatch: expected ' + expectedBytes + ' bytes, got ' + stat.size));
                        return;
                    }

                    /* Validate RBBN magic */
                    const fd = fs.openSync(tmpPath, 'r');
                    const magic = Buffer.alloc(4);
                    fs.readSync(fd, magic, 0, 4, 0);
                    fs.closeSync(fd);

                    if (magic.toString('ascii') !== 'RBBN') {
                        cleanup(new Error('Downloaded file is not a valid ribbon filter (bad magic)'));
                        return;
                    }

                    /* Validate SHA-256 */
                    if (expectedSha256) {
                        const hash = crypto.createHash('sha256');
                        const stream = fs.createReadStream(tmpPath);
                        stream.on('data', (chunk) => hash.update(chunk));
                        stream.on('end', () => {
                            const actual = hash.digest('hex');
                            if (actual !== expectedSha256) {
                                cleanup(new Error(
                                    'SHA-256 mismatch!\n' +
                                    '  Expected: ' + expectedSha256 + '\n' +
                                    '  Got:      ' + actual + '\n' +
                                    'The downloaded file may have been tampered with.'
                                ));
                                return;
                            }
                            done = true;
                            fs.renameSync(tmpPath, destPath);
                            resolve(destPath);
                        });
                        stream.on('error', cleanup);
                    } else {
                        done = true;
                        fs.renameSync(tmpPath, destPath);
                        resolve(destPath);
                    }
                });
            });
        }).on('error', cleanup);
    });
}

module.exports = { download };
