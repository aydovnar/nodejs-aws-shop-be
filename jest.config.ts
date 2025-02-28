import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['product-service/lambda/tests'],  // Changed from 'lambda/tests' to 'lambda'
    testMatch: ['**/tests/**/*.test.ts'],  // Updated to match tests directory
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    clearMocks: true,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/dist/'
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/'
    ],
    verbose: true
};

export default config;
