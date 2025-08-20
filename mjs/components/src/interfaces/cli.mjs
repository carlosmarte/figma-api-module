#!/usr/bin/env node

/**
 * CLI interface for Figma Components API
 * Provides command-line access to components, component sets, and styles
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { FigmaComponentsSDK } from './sdk.mjs';

const program = new Command();

// Configure CLI
program
  .name('figma-components')
  .description('CLI for Figma Components, Component Sets, and Styles API')
  .version('1.0.0')
  .option('-k, --api-key <key>', 'Figma API token (or set FIGMA_API_TOKEN env var)')
  .option('-v, --verbose', 'Verbose output')
  .option('-j, --json', 'Output as JSON')
  .option('--pretty', 'Pretty print JSON output');

// Helper to get SDK instance
function getSDK(options) {
  const apiToken = options.apiKey || process.env.FIGMA_API_TOKEN;

  if (!apiToken) {
    console.error(chalk.red('Error: Figma API token is required'));
    console.error('Set via --api-key flag or FIGMA_API_TOKEN environment variable');
    process.exit(1);
  }

  return new FigmaComponentsSDK({
    apiToken,
    logger: options.verbose ? console : { debug: () => {}, warn: console.warn, error: console.error }
  });
}

// Helper to output results
function outputResult(data, options) {
  if (options.json || options.pretty) {
    console.log(JSON.stringify(data, null, options.pretty ? 2 : 0));
  } else {
    console.log(data);
  }
}

// ==========================================
// Components Commands
// ==========================================

const componentsCmd = program
  .command('components')
  .description('Manage Figma components');

// Get team components
componentsCmd
  .command('list-team <team-id>')
  .description('List components in a team library')
  .option('-s, --page-size <n>', 'Number of items per page', '30')
  .option('-a, --after <cursor>', 'Pagination cursor (after)')
  .option('-b, --before <cursor>', 'Pagination cursor (before)')
  .option('--all', 'Get all components (handles pagination automatically)')
  .action(async (teamId, options, command) => {
    const spinner = ora('Fetching team components...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      let result;
      if (options.all) {
        const components = await sdk.getAllTeamComponents(teamId);
        result = { components, total: components.length };
        spinner.succeed(`Fetched ${components.length} components`);
      } else {
        const paginationOptions = {};
        if (options.pageSize) paginationOptions.pageSize = parseInt(options.pageSize);
        if (options.after) paginationOptions.after = parseInt(options.after);
        if (options.before) paginationOptions.before = parseInt(options.before);

        result = await sdk.getTeamComponents(teamId, paginationOptions);
        spinner.succeed(`Fetched ${result.components?.length || 0} components`);
      }
      
      outputResult(result, command.optsWithGlobals());
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Get file components
componentsCmd
  .command('list-file <file-key>')
  .description('List components in a file library')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Fetching file components...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const result = await sdk.getFileComponents(fileKey);
      spinner.succeed(`Fetched ${result.components?.length || 0} components`);
      outputResult(result, command.optsWithGlobals());
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Get component by key
componentsCmd
  .command('get <key>')
  .description('Get component metadata by key')
  .action(async (key, options, command) => {
    const spinner = ora('Fetching component...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const result = await sdk.getComponent(key);
      spinner.succeed('Component fetched');
      outputResult(result, command.optsWithGlobals());
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Search components
componentsCmd
  .command('search <team-id> <search-term>')
  .description('Search components by name in team')
  .action(async (teamId, searchTerm, options, command) => {
    const spinner = ora(`Searching for "${searchTerm}"...`).start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const results = await sdk.searchComponents(teamId, searchTerm);
      spinner.succeed(`Found ${results.length} matching components`);
      outputResult({ results, total: results.length }, command.optsWithGlobals());
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Batch get components
componentsCmd
  .command('batch-get')
  .description('Get multiple components by keys')
  .requiredOption('-k, --keys <keys...>', 'Component keys (space separated)')
  .action(async (options, command) => {
    const spinner = ora(`Fetching ${options.keys.length} components...`).start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const result = await sdk.batchGetComponents(options.keys);
      spinner.succeed(`Batch operation complete: ${result.successful.length} successful, ${result.failed.length} failed`);
      outputResult(result, command.optsWithGlobals());
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// ==========================================
// Component Sets Commands
// ==========================================

const componentSetsCmd = program
  .command('component-sets')
  .description('Manage Figma component sets');

// Get team component sets
componentSetsCmd
  .command('list-team <team-id>')
  .description('List component sets in a team library')
  .option('-s, --page-size <n>', 'Number of items per page', '30')
  .option('-a, --after <cursor>', 'Pagination cursor (after)')
  .option('-b, --before <cursor>', 'Pagination cursor (before)')
  .option('--all', 'Get all component sets (handles pagination automatically)')
  .action(async (teamId, options, command) => {
    const spinner = ora('Fetching team component sets...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      let result;
      if (options.all) {
        const componentSets = await sdk.getAllTeamComponentSets(teamId);
        result = { component_sets: componentSets, total: componentSets.length };
        spinner.succeed(`Fetched ${componentSets.length} component sets`);
      } else {
        const paginationOptions = {};
        if (options.pageSize) paginationOptions.pageSize = parseInt(options.pageSize);
        if (options.after) paginationOptions.after = parseInt(options.after);
        if (options.before) paginationOptions.before = parseInt(options.before);

        result = await sdk.getTeamComponentSets(teamId, paginationOptions);
        spinner.succeed(`Fetched ${result.component_sets?.length || 0} component sets`);
      }
      
      outputResult(result, command.optsWithGlobals());
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Get file component sets
componentSetsCmd
  .command('list-file <file-key>')
  .description('List component sets in a file library')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Fetching file component sets...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const result = await sdk.getFileComponentSets(fileKey);
      spinner.succeed(`Fetched ${result.component_sets?.length || 0} component sets`);
      outputResult(result, command.optsWithGlobals());
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Get component set by key
componentSetsCmd
  .command('get <key>')
  .description('Get component set metadata by key')
  .action(async (key, options, command) => {
    const spinner = ora('Fetching component set...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const result = await sdk.getComponentSet(key);
      spinner.succeed('Component set fetched');
      outputResult(result, command.optsWithGlobals());
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Batch get component sets
componentSetsCmd
  .command('batch-get')
  .description('Get multiple component sets by keys')
  .requiredOption('-k, --keys <keys...>', 'Component set keys (space separated)')
  .action(async (options, command) => {
    const spinner = ora(`Fetching ${options.keys.length} component sets...`).start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const result = await sdk.batchGetComponentSets(options.keys);
      spinner.succeed(`Batch operation complete: ${result.successful.length} successful, ${result.failed.length} failed`);
      outputResult(result, command.optsWithGlobals());
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// ==========================================
// Styles Commands
// ==========================================

const stylesCmd = program
  .command('styles')
  .description('Manage Figma styles');

// Get team styles
stylesCmd
  .command('list-team <team-id>')
  .description('List styles in a team library')
  .option('-s, --page-size <n>', 'Number of items per page', '30')
  .option('-a, --after <cursor>', 'Pagination cursor (after)')
  .option('-b, --before <cursor>', 'Pagination cursor (before)')
  .option('-t, --type <type>', 'Filter by style type (FILL, TEXT, EFFECT, GRID)')
  .option('--all', 'Get all styles (handles pagination automatically)')
  .action(async (teamId, options, command) => {
    const spinner = ora('Fetching team styles...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      let result;
      if (options.all) {
        let styles = await sdk.getAllTeamStyles(teamId);
        
        // Filter by type if specified
        if (options.type) {
          styles = await sdk.findStylesByType(teamId, options.type);
        }
        
        result = { styles, total: styles.length };
        spinner.succeed(`Fetched ${styles.length} styles`);
      } else {
        const paginationOptions = {};
        if (options.pageSize) paginationOptions.pageSize = parseInt(options.pageSize);
        if (options.after) paginationOptions.after = parseInt(options.after);
        if (options.before) paginationOptions.before = parseInt(options.before);

        result = await sdk.getTeamStyles(teamId, paginationOptions);
        
        // Filter by type if specified
        if (options.type && result.styles) {
          result.styles = result.styles.filter(style => style.style_type === options.type);
        }
        
        spinner.succeed(`Fetched ${result.styles?.length || 0} styles`);
      }
      
      outputResult(result, command.optsWithGlobals());
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Get file styles
stylesCmd
  .command('list-file <file-key>')
  .description('List styles in a file library')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Fetching file styles...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const result = await sdk.getFileStyles(fileKey);
      spinner.succeed(`Fetched ${result.styles?.length || 0} styles`);
      outputResult(result, command.optsWithGlobals());
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Get style by key
stylesCmd
  .command('get <key>')
  .description('Get style metadata by key')
  .action(async (key, options, command) => {
    const spinner = ora('Fetching style...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const result = await sdk.getStyle(key);
      spinner.succeed('Style fetched');
      outputResult(result, command.optsWithGlobals());
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Batch get styles
stylesCmd
  .command('batch-get')
  .description('Get multiple styles by keys')
  .requiredOption('-k, --keys <keys...>', 'Style keys (space separated)')
  .action(async (options, command) => {
    const spinner = ora(`Fetching ${options.keys.length} styles...`).start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const result = await sdk.batchGetStyles(options.keys);
      spinner.succeed(`Batch operation complete: ${result.successful.length} successful, ${result.failed.length} failed`);
      outputResult(result, command.optsWithGlobals());
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// ==========================================
// Library Commands
// ==========================================

const libraryCmd = program
  .command('library')
  .description('Manage complete library content');

// Get team library
libraryCmd
  .command('get-team <team-id>')
  .description('Get complete team library (components, component sets, styles)')
  .action(async (teamId, options, command) => {
    const spinner = ora('Fetching complete team library...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const result = await sdk.getTeamLibrary(teamId);
      spinner.succeed(`Fetched library: ${result.summary.componentsCount} components, ${result.summary.componentSetsCount} component sets, ${result.summary.stylesCount} styles`);
      outputResult(result, command.optsWithGlobals());
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Get file library
libraryCmd
  .command('get-file <file-key>')
  .description('Get complete file library (components, component sets, styles)')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Fetching complete file library...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const result = await sdk.getFileLibrary(fileKey);
      spinner.succeed(`Fetched library: ${result.summary.componentsCount} components, ${result.summary.componentSetsCount} component sets, ${result.summary.stylesCount} styles`);
      outputResult(result, command.optsWithGlobals());
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Get library analytics
libraryCmd
  .command('analytics <team-id>')
  .description('Get team library analytics')
  .action(async (teamId, options, command) => {
    const spinner = ora('Analyzing team library...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const result = await sdk.getTeamLibraryAnalytics(teamId);
      spinner.succeed(`Analysis complete: ${result.totalItems} total items`);
      outputResult(result, command.optsWithGlobals());
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Export library
libraryCmd
  .command('export <team-id>')
  .description('Export team library as structured data')
  .option('--no-metadata', 'Exclude metadata from export')
  .option('-f, --format <format>', 'Export format (json)', 'json')
  .action(async (teamId, options, command) => {
    const spinner = ora('Exporting team library...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const result = await sdk.exportTeamLibrary(teamId, {
        includeMetadata: options.metadata !== false,
        format: options.format
      });
      spinner.succeed('Library exported');
      
      if (command.optsWithGlobals().json || command.optsWithGlobals().pretty) {
        console.log(typeof result === 'string' ? result : JSON.stringify(result, null, command.optsWithGlobals().pretty ? 2 : 0));
      } else {
        console.log(result);
      }
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// ==========================================
// Search Commands
// ==========================================

const searchCmd = program
  .command('search')
  .description('Search and filter library content');

// Find components
searchCmd
  .command('components <team-id>')
  .description('Find components by pattern')
  .option('-n, --name <pattern>', 'Name pattern (partial match)')
  .option('-d, --description <pattern>', 'Description pattern (partial match)')
  .option('-t, --node-type <type>', 'Node type filter')
  .action(async (teamId, options, command) => {
    const spinner = ora('Searching components...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const pattern = {};
      if (options.name) pattern.name = options.name;
      if (options.description) pattern.description = options.description;
      if (options.nodeType) pattern.nodeType = options.nodeType;

      const results = await sdk.findComponents(teamId, pattern);
      spinner.succeed(`Found ${results.length} matching components`);
      outputResult({ results, total: results.length }, command.optsWithGlobals());
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Health check command
program
  .command('health')
  .description('Check API connectivity')
  .action(async (options, command) => {
    const spinner = ora('Checking API health...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const isHealthy = await sdk.healthCheck();
      if (isHealthy) {
        spinner.succeed('API is healthy');
        process.exit(0);
      } else {
        spinner.fail('API health check failed');
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(`Health check failed: ${error.message}`);
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('Show SDK statistics')
  .action(async (options, command) => {
    const sdk = getSDK(command.optsWithGlobals());
    const stats = sdk.getStats();
    
    outputResult(stats, command.optsWithGlobals());
  });

// Parse arguments
program.parse();