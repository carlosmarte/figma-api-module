#!/usr/bin/env node

/**
 * CLI interface for Figma Files API
 * Provides command-line access to all file operations
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { FigmaApiClient } from '@figma-api/fetch';
import { FigmaFilesSDK } from './sdk.mjs';

const program = new Command();

// Configure CLI
program
  .name('figma-files')
  .description('CLI for Figma Files API operations')
  .version('1.0.0')
  .option('-t, --token <token>', 'Figma API token (or set FIGMA_API_TOKEN env var)')
  .option('-v, --verbose', 'Verbose output')
  .option('--timeout <ms>', 'Request timeout in milliseconds', '30000')
  .option('--max-retries <n>', 'Maximum retry attempts', '3');

// Helper to get SDK instance
function getSDK(options) {
  const apiToken = options.token || process.env.FIGMA_API_TOKEN;

  if (!apiToken) {
    console.error(chalk.red('Error: Figma API token is required'));
    console.error('Set via --token flag or FIGMA_API_TOKEN environment variable');
    console.error('Get your token at: https://www.figma.com/developers/api#access-tokens');
    process.exit(1);
  }

  const clientConfig = {
    apiToken,
    timeout: parseInt(options.timeout),
    retryConfig: {
      maxRetries: parseInt(options.maxRetries)
    }
  };

  const fetcher = new FigmaApiClient(clientConfig);

  return new FigmaFilesSDK({
    fetcher,
    logger: options.verbose ? console : { debug: () => {}, warn: console.warn, error: console.error }
  });
}

// Helper to format JSON output
function formatOutput(data, options) {
  if (options.json) {
    return JSON.stringify(data, null, 2);
  }
  return JSON.stringify(data, null, 2);
}

// Helper to handle async command errors
function handleCommandError(error, spinner = null) {
  if (spinner) {
    spinner.fail(`Failed: ${error.message}`);
  } else {
    console.error(chalk.red(`Error: ${error.message}`));
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.error(chalk.gray(error.stack));
  }
  
  process.exit(1);
}

// ==========================================
// File Commands
// ==========================================

// Get file command
program
  .command('get')
  .description('Get file JSON data')
  .requiredOption('-f, --file-key <key>', 'Figma file key')
  .option('--version <id>', 'Specific version ID to get')
  .option('--ids <nodeIds>', 'Comma-separated list of node IDs to include')
  .option('--depth <n>', 'How deep into the document tree to traverse', parseInt)
  .option('--geometry <type>', 'Set to "paths" to export vector data')
  .option('--plugin-data <ids>', 'Comma-separated plugin IDs to include data for')
  .option('--branch-data', 'Include branch metadata')
  .option('--json', 'Output as JSON')
  .action(async (options, command) => {
    const spinner = ora('Fetching file data...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const fileData = await sdk.getFile(options.fileKey, {
        version: options.version,
        ids: options.ids,
        depth: options.depth,
        geometry: options.geometry,
        pluginData: options.pluginData,
        branchData: options.branchData
      });

      spinner.succeed('File data retrieved');
      console.log(formatOutput(fileData, options));
    } catch (error) {
      handleCommandError(error, spinner);
    }
  });

// Get nodes command
program
  .command('get-nodes')
  .description('Get specific nodes from a file')
  .requiredOption('-f, --file-key <key>', 'Figma file key')
  .requiredOption('-i, --ids <nodeIds>', 'Comma-separated list of node IDs')
  .option('--version <id>', 'Specific version ID to get')
  .option('--depth <n>', 'How deep into the node tree to traverse', parseInt)
  .option('--geometry <type>', 'Set to "paths" to export vector data')
  .option('--plugin-data <ids>', 'Comma-separated plugin IDs to include data for')
  .option('--json', 'Output as JSON')
  .action(async (options, command) => {
    const spinner = ora('Fetching node data...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const nodeData = await sdk.getNodes(options.fileKey, options.ids, {
        version: options.version,
        depth: options.depth,
        geometry: options.geometry,
        pluginData: options.pluginData
      });

      spinner.succeed('Node data retrieved');
      console.log(formatOutput(nodeData, options));
    } catch (error) {
      handleCommandError(error, spinner);
    }
  });

// ==========================================
// Image Commands
// ==========================================

// Render images command
program
  .command('render-images')
  .description('Render images of file nodes')
  .requiredOption('-f, --file-key <key>', 'Figma file key')
  .requiredOption('-i, --ids <nodeIds>', 'Comma-separated list of node IDs to render')
  .option('--version <id>', 'Specific version ID to get')
  .option('--scale <n>', 'Image scaling factor (0.01 to 4)', parseFloat)
  .option('--format <fmt>', 'Image format (jpg, png, svg, pdf)', 'png')
  .option('--svg-outline-text', 'Render text as outlines in SVG')
  .option('--svg-include-id', 'Include id attributes in SVG')
  .option('--svg-include-node-id', 'Include node id attributes in SVG')
  .option('--svg-simplify-stroke', 'Simplify strokes in SVG')
  .option('--contents-only', 'Exclude overlapping content')
  .option('--use-absolute-bounds', 'Use full node dimensions')
  .option('--json', 'Output as JSON')
  .action(async (options, command) => {
    const spinner = ora('Rendering images...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const images = await sdk.service.renderImages(options.fileKey, options.ids, {
        version: options.version,
        scale: options.scale,
        format: options.format,
        svgOutlineText: options.svgOutlineText,
        svgIncludeId: options.svgIncludeId,
        svgIncludeNodeId: options.svgIncludeNodeId,
        svgSimplifyStroke: options.svgSimplifyStroke,
        contentsOnly: options.contentsOnly,
        useAbsoluteBounds: options.useAbsoluteBounds
      });

      spinner.succeed('Images rendered');
      console.log(formatOutput(images, options));
    } catch (error) {
      handleCommandError(error, spinner);
    }
  });

// Get image fills command
program
  .command('get-image-fills')
  .description('Get image fills from a file')
  .requiredOption('-f, --file-key <key>', 'Figma file key')
  .option('--json', 'Output as JSON')
  .action(async (options, command) => {
    const spinner = ora('Fetching image fills...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const imageFills = await sdk.getImageFills(options.fileKey);

      spinner.succeed('Image fills retrieved');
      console.log(formatOutput(imageFills, options));
    } catch (error) {
      handleCommandError(error, spinner);
    }
  });

// ==========================================
// Metadata Commands
// ==========================================

// Get metadata command
program
  .command('get-metadata')
  .description('Get file metadata')
  .requiredOption('-f, --file-key <key>', 'Figma file key')
  .option('--json', 'Output as JSON')
  .action(async (options, command) => {
    const spinner = ora('Fetching metadata...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const metadata = await sdk.getMetadata(options.fileKey);

      spinner.succeed('Metadata retrieved');
      console.log(formatOutput(metadata, options));
    } catch (error) {
      handleCommandError(error, spinner);
    }
  });

// Get versions command
program
  .command('get-versions')
  .description('Get file version history')
  .requiredOption('-f, --file-key <key>', 'Figma file key')
  .option('--page-size <n>', 'Number of versions per page (max 50)', parseInt)
  .option('--before <id>', 'Get versions before this ID', parseInt)
  .option('--after <id>', 'Get versions after this ID', parseInt)
  .option('--json', 'Output as JSON')
  .action(async (options, command) => {
    const spinner = ora('Fetching version history...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const versions = await sdk.getVersions(options.fileKey, {
        pageSize: options.pageSize,
        before: options.before,
        after: options.after
      });

      spinner.succeed('Version history retrieved');
      console.log(formatOutput(versions, options));
    } catch (error) {
      handleCommandError(error, spinner);
    }
  });

// ==========================================
// Convenience Commands
// ==========================================

// Get pages command
program
  .command('pages')
  .description('Get file pages (top-level canvas nodes)')
  .requiredOption('-f, --file-key <key>', 'Figma file key')
  .option('--json', 'Output as JSON')
  .action(async (options, command) => {
    const spinner = ora('Fetching pages...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const pages = await sdk.getPages(options.fileKey);

      spinner.succeed(`Found ${pages.length} pages`);
      console.log(formatOutput(pages, options));
    } catch (error) {
      handleCommandError(error, spinner);
    }
  });

// Search nodes command
program
  .command('search')
  .description('Search for nodes by name')
  .requiredOption('-f, --file-key <key>', 'Figma file key')
  .requiredOption('-q, --query <term>', 'Search term')
  .option('--json', 'Output as JSON')
  .action(async (options, command) => {
    const spinner = ora(`Searching for "${options.query}"...`).start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const matches = await sdk.searchNodesByName(options.fileKey, options.query);

      spinner.succeed(`Found ${matches.length} matches`);
      console.log(formatOutput(matches, options));
    } catch (error) {
      handleCommandError(error, spinner);
    }
  });

// Analytics command
program
  .command('analytics')
  .description('Get file analytics summary')
  .requiredOption('-f, --file-key <key>', 'Figma file key')
  .option('--json', 'Output as JSON')
  .action(async (options, command) => {
    const spinner = ora('Analyzing file...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const analytics = await sdk.getFileAnalytics(options.fileKey);

      spinner.succeed('File analyzed');
      console.log(formatOutput(analytics, options));
    } catch (error) {
      handleCommandError(error, spinner);
    }
  });

// Extract text command
program
  .command('extract-text')
  .description('Extract all text content from a file')
  .requiredOption('-f, --file-key <key>', 'Figma file key')
  .option('--json', 'Output as JSON')
  .action(async (options, command) => {
    const spinner = ora('Extracting text content...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const textContent = await sdk.extractTextContent(options.fileKey);

      spinner.succeed(`Extracted ${textContent.length} text elements`);
      console.log(formatOutput(textContent, options));
    } catch (error) {
      handleCommandError(error, spinner);
    }
  });

// ==========================================
// Utility Commands
// ==========================================

// Health check command
program
  .command('health')
  .description('Check API health and connectivity')
  .action(async (options, command) => {
    const spinner = ora('Checking API health...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const isHealthy = await sdk.healthCheck();
      
      if (isHealthy) {
        spinner.succeed('API is healthy');
        console.log(chalk.green('✓ Figma API is accessible'));
      } else {
        spinner.fail('API health check failed');
        process.exit(1);
      }
    } catch (error) {
      handleCommandError(error, spinner);
    }
  });

// Stats command
program
  .command('stats')
  .description('Show client statistics')
  .action(async (options, command) => {
    const sdk = getSDK(command.optsWithGlobals());
    const stats = sdk.getStats();

    console.log(chalk.blue('Client Statistics:'));
    console.log(formatOutput(stats, { json: true }));
  });

// Parse file URL command
program
  .command('parse-url')
  .description('Parse file key from Figma URL')
  .requiredOption('-u, --url <url>', 'Figma file URL')
  .action((options) => {
    try {
      const fileKey = FigmaFilesSDK.parseFileKeyFromUrl(options.url);
      const nodeId = FigmaFilesSDK.parseNodeIdFromUrl(options.url);

      console.log(chalk.blue('Parsed URL:'));
      console.log(formatOutput({ fileKey, nodeId }, { json: true }));
    } catch (error) {
      handleCommandError(error);
    }
  });

// Error handling for unknown commands
program.on('command:*', () => {
  console.error(chalk.red(`Invalid command: ${program.args.join(' ')}`));
  console.log('Use --help to see available commands');
  process.exit(1);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('Unhandled Rejection:'), reason);
  process.exit(1);
});

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}