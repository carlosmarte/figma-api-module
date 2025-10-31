/**
 * Jest configuration for dev-resources package
 * Extends shared base configuration
 */

import baseConfig from '../jest.base.config.mjs';

export default {
  ...baseConfig,
  displayName: 'dev-resources',
  testMatch: [
    '<rootDir>/**/*.test.mjs'
  ],
  collectCoverageFrom: [
    '*.mjs',
    '!cli.mjs',
    '!jest.config.mjs',
    '!*.test.mjs'
  ]
};
