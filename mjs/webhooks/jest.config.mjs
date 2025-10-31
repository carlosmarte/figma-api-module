/**
 * Jest configuration for webhooks package
 * Extends shared base configuration
 */

import baseConfig from '../jest.base.config.mjs';

export default {
  ...baseConfig,
  displayName: 'webhooks',
  testMatch: [
    '<rootDir>/**/*.test.mjs'
  ],
  collectCoverageFrom: [
    '*.mjs',
    '!cli.mjs',
    '!jest.config.mjs'
  ]
};
