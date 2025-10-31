/**
 * Jest configuration for files package
 * Extends shared base configuration
 */

import baseConfig from '../jest.base.config.mjs';

export default {
  ...baseConfig,
  displayName: 'files',
  testMatch: [
    '<rootDir>/tests/**/*.test.mjs'
  ]
};
