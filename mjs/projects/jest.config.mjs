/**
 * Jest configuration for projects package
 * Extends shared base configuration
 */

import baseConfig from '../jest.base.config.mjs';

export default {
  ...baseConfig,
  displayName: 'projects',
  testMatch: [
    '<rootDir>/tests/**/*.test.mjs'
  ]
};
