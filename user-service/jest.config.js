module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.ts'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/server.ts',
    ],
    setupFilesAfterEnv: [],
    testTimeout: 60000,
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
};