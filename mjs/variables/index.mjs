/**
 * figma-variables-sdk - Main entry point
 * Exports all public interfaces for the Figma Variables API library
 */

// Core exports
export { FigmaVariablesClient } from './src/core/client.mjs';
export { FigmaVariablesService } from './src/core/service.mjs';
export * from './src/core/exceptions.mjs';

// Interface exports
export { FigmaVariablesSDK } from './src/interfaces/sdk.mjs';
export { default as FigmaVariablesSDK } from './src/interfaces/sdk.mjs';

// Version info
export const VERSION = '1.0.0';

// Re-export commonly used items for convenience
export { default } from './src/interfaces/sdk.mjs';