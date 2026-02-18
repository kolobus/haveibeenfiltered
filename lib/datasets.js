'use strict';

const DATASETS = {
    hibp: {
        name: 'hibp',
        version: 1,
        filename: 'ribbon-hibp-v1.bin',
        url: 'https://files.haveibeenfiltered.com/v0.1/ribbon-hibp-v1.bin',
        expectedBytes: 1918974105,
        sha256: '4eeb8608fa8541a51a952ecda91ad2f86e6f7457b0dbe34b88ba8a7ed33750ce',
    },
    rockyou: {
        name: 'rockyou',
        version: 1,
        filename: 'ribbon-rockyou-v1.bin',
        url: 'https://files.haveibeenfiltered.com/v0.1/ribbon-rockyou-v1.bin',
        expectedBytes: 13456384,
        sha256: '777d3c1640e7067bc7fb222488199c3371de5360639561f1f082db6b7c16a447',
    },
};

module.exports = { DATASETS };
