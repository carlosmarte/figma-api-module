/**
 * Jest configuration for variables package
 * Extends shared base configuration
 */

import baseConfig from '../jest.base.config.mjs';

export default {
  ...baseConfig,
  displayName: 'variables',
  testMatch: [
    '<rootDir>/tests/**/*.test.mjs'
  ]
};
