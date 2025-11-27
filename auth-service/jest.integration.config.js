const baseConfig = require('./jest.config');

module.exports = {
    ...baseConfig,
    testMatch: ['**/__tests__/integration/**/*.test.ts'],
    testTimeout: 30000,
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/__tests__/**',
        '!src/server.ts'
    ]
};