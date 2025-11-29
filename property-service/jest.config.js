/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    testMatch: [
        "**/__tests__/**/*.(test|integration).ts"
    ],
    coveragePathIgnorePatterns: [
        "/node_modules/",
        "/dist/",
        "/__tests__/"
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
    ],
    testPathIgnorePatterns: [
        "/node_modules/",
        "/dist/"
    ]
};