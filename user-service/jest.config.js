/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    testMatch: [
        "**/__tests__/**/*.test.ts"
    ],
    coveragePathIgnorePatterns: [
        "/node_modules/",
        "/dist/"
    ],
    verbose: true
};