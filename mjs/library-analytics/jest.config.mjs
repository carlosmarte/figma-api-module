/**
 * Jest configuration for library-analytics package
 * Extends shared base configuration
 */

import baseConfig from '../jest.base.config.mjs';

export default {
  ...baseConfig,
  displayName: 'library-analytics',
  testMatch: [
    '<rootDir>/**/*.test.mjs'
  ],
  collectCoverageFrom: [
    '*.mjs',
    '!cli.mjs',
    '!jest.config.mjs'
  ]
};
