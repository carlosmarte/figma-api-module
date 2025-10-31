/**
 * Shared Jest configuration base
 * Individual workspace configs extend this to reduce duplication
 */

export default {
  // Node environment for testing
  testEnvironment: 'node',

  // No transformation needed for ES modules
  transform: {},

  // Match test files
  testMatch: [
    '**/tests/**/*.test.mjs',
    '**/tests/**/*.test.js',
    '**/*.test.mjs',
    '**/*.test.js'
  ],

  // Module file extensions
  moduleFileExtensions: ['js', 'mjs', 'json'],

  // Clear mocks between tests
  clearMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.cache/'
  ],

  // Coverage settings (can be overridden by root config)
  collectCoverageFrom: [
    'src/**/*.{js,mjs}',
    '!src/**/*.test.{js,mjs}',
    '!src/**/*.config.{js,mjs}',
    '!**/node_modules/**',
    '!**/dist/**'
  ]
};
