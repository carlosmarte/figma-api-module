/**
 * Root Jest configuration for monorepo
 * Runs all workspace tests in a single Jest instance
 */

export default {
  // Run tests from all workspace packages
  projects: [
    '<rootDir>/comments',
    '<rootDir>/components',
    '<rootDir>/dev-resources',
    '<rootDir>/files',
    '<rootDir>/figma-fetch',
    '<rootDir>/library-analytics',
    '<rootDir>/projects',
    '<rootDir>/variables',
    '<rootDir>/webhooks'
  ],

  // Coverage configuration for entire monorepo
  // Coverage is disabled by default, use --coverage flag or npm run test:coverage
  collectCoverage: false,
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    '**/src/**/*.{js,mjs}',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/dist/**',
    '!**/*.test.{js,mjs}',
    '!**/*.config.{js,mjs}'
  ],

  // Coverage thresholds (adjust as needed)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Reporter configuration
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Show verbose output
  verbose: true,

  // Limit number of workers for better performance
  maxWorkers: '50%'
};
