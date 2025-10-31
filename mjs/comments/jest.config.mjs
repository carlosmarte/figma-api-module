/**
 * Jest configuration for comments package
 * Extends shared base configuration
 */

import baseConfig from '../jest.base.config.mjs';

export default {
  ...baseConfig,
  displayName: 'comments',
  testMatch: [
    '<rootDir>/tests/**/*.test.mjs'
  ]
};
