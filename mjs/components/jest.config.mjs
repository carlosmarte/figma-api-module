/**
 * Jest configuration for components package
 * Extends shared base configuration
 */

import baseConfig from '../jest.base.config.mjs';

export default {
  ...baseConfig,
  displayName: 'components',
  testMatch: [
    '<rootDir>/tests/**/*.test.mjs'
  ]
};
