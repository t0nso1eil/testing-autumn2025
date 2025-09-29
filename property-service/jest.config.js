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
    verbose: true,
    moduleFileExtensions: ['ts', 'js', 'json'],
    roots: ['<rootDir>/src', '<rootDir>/__tests__'],
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/server.ts'
    ]
};