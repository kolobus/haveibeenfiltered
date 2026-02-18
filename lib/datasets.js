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
    'hibp-min5': {
        name: 'hibp-min5',
        version: 1,
        filename: 'ribbon-hibp-v1-min5.bin',
        url: 'https://files.haveibeenfiltered.com/v0.1/ribbon-hibp-v1-min5.bin',
        expectedBytes: 760791541,
        sha256: '4422f5659cb5fe39cf284b844328bfd3f7ab37fac0fe649b4cff216ffd2ac5da',
    },
    'hibp-min10': {
        name: 'hibp-min10',
        version: 1,
        filename: 'ribbon-hibp-v1-min10.bin',
        url: 'https://files.haveibeenfiltered.com/v0.1/ribbon-hibp-v1-min10.bin',
        expectedBytes: 455760736,
        sha256: '8c71d6a3696d27bcf21a30ddcd67f7e290a71210800db86810ffb84a426fe93e',
    },
    'hibp-min20': {
        name: 'hibp-min20',
        version: 1,
        filename: 'ribbon-hibp-v1-min20.bin',
        url: 'https://files.haveibeenfiltered.com/v0.1/ribbon-hibp-v1-min20.bin',
        expectedBytes: 271649178,
        sha256: '31a2c7942698fce74d95ce54dfb61f383ef1a33dce496b88c672e1ac07c71c43',
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
