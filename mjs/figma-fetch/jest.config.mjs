/**
 * Jest configuration for figma-fetch package
 * Extends shared base configuration
 */

import baseConfig from '../jest.base.config.mjs';

export default {
  ...baseConfig,
  displayName: 'figma-fetch',
  testMatch: [
    '<rootDir>/tests/**/*.test.mjs'
  ]
};
