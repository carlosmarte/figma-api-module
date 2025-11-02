#!/usr/bin/env node

/**
 * CLI interface for figma-dev-resources
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFileSync } from 'fs';
import { FigmaApiClient } from '@figma-api/fetch';
import { FigmaDevResourcesSDK } from './sdk.mjs';

const program = new Command();

// Configure CLI
program
  .name('figma-dev-resources')
  .description('CLI for Figma Dev Resources API')
  .version('1.0.0')
  .option('-t, --token <token>', 'Figma access token (or set FIGMA_TOKEN env var)')
  .option('-b, --base-url <url>', 'API base URL', 'https://api.figma.com')
  .option('-v, --verbose', 'Verbose output')
  .option('--timeout <ms>', 'Request timeout in milliseconds', '30000');

// Helper to get SDK instance
function getSDK(options) {
  const apiToken = options.token || process.env.FIGMA_TOKEN;

  if (!apiToken) {
    console.error(chalk.red('Error: Figma access token is required'));
    console.error('Set via --token flag or FIGMA_TOKEN environment variable');
    console.error('Get your token at: https://www.figma.com/developers/api#access-tokens');
    process.exit(1);
  }

  const fetcher = new FigmaApiClient({
    apiToken,
    baseUrl: options.baseUrl,
    timeout: parseInt(options.timeout),
    logger: options.verbose ? console : undefined
  });

  return new FigmaDevResourcesSDK({
    fetcher,
    logger: options.verbose ? console : undefined
  });
}

// Helper to format output
function formatOutput(data, format = 'json') {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }
  return data;
}

// Helper to parse JSON input
function parseJsonInput(input) {
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }
}

// Get command
program
  .command('get <file-key>')
  .description('Get dev resources from a file')
  .option('-n, --node-ids <ids>', 'Comma-separated list of node IDs to filter by')
  .option('--format <format>', 'Output format (json, table)', 'json')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Fetching dev resources...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const nodeIds = options.nodeIds ? options.nodeIds.split(',').map(id => id.trim()) : null;
      const resources = await sdk.getFileDevResources(fileKey, nodeIds);
      
      spinner.succeed(`Found ${resources.length} dev resources`);
      
      if (options.format === 'table' && resources.length > 0) {
        console.table(resources.map(r => ({
          ID: r.id,
          Name: r.name,
          URL: r.url,
          'Node ID': r.node_id
        })));
      } else {
        console.log(formatOutput(resources, options.format));
      }
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Create command
program
  .command('create <file-key> <node-id>')
  .description('Create a single dev resource')
  .requiredOption('-n, --name <name>', 'Resource name')
  .requiredOption('-u, --url <url>', 'Resource URL')
  .action(async (fileKey, nodeId, options, command) => {
    const spinner = ora('Creating dev resource...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const resource = await sdk.createDevResource(fileKey, nodeId, options.name, options.url);
      spinner.succeed('Dev resource created');
      console.log(formatOutput(resource));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Batch create command
program
  .command('create-batch')
  .description('Create multiple dev resources from JSON file or stdin')
  .option('-f, --file <file>', 'JSON file containing resources array')
  .option('--progress', 'Show progress for batch operations')
  .action(async (options, command) => {
    const spinner = ora('Creating dev resources...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      let resourcesData;
      
      if (options.file) {
        const fileContent = readFileSync(options.file, 'utf8');
        resourcesData = parseJsonInput(fileContent);
      } else {
        // Read from stdin
        let stdinData = '';
        for await (const chunk of process.stdin) {
          stdinData += chunk;
        }
        resourcesData = parseJsonInput(stdinData);
      }

      if (!Array.isArray(resourcesData)) {
        throw new Error('Input must be an array of resource objects');
      }

      let progressCallback = null;
      if (options.progress) {
        progressCallback = (results) => {
          spinner.text = `Creating dev resources... ${results.processed}/${results.total}`;
        };
      }

      // Note: batch operations require multiple file keys, use createMultiFileDevResources
      const results = await sdk.createMultiFileDevResources(resourcesData, progressCallback);
      
      spinner.succeed(`Created ${results.links_created.length} dev resources`);
      
      if (results.errors.length > 0) {
        console.log(chalk.yellow(`\nWarning: ${results.errors.length} errors occurred:`));
        console.log(formatOutput(results.errors));
      }
      
      console.log(formatOutput({
        created: results.links_created,
        errors: results.errors
      }));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Update command
program
  .command('update <id>')
  .description('Update a dev resource')
  .option('-n, --name <name>', 'New resource name')
  .option('-u, --url <url>', 'New resource URL')
  .action(async (id, options, command) => {
    const spinner = ora('Updating dev resource...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const updates = {};
      if (options.name) updates.name = options.name;
      if (options.url) updates.url = options.url;

      if (Object.keys(updates).length === 0) {
        throw new Error('At least one update field (name or url) must be provided');
      }

      const resource = await sdk.updateDevResource(id, updates);
      spinner.succeed('Dev resource updated');
      console.log(formatOutput(resource));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Delete command
program
  .command('delete <file-key> <id>')
  .description('Delete a dev resource')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (fileKey, id, options, command) => {
    if (!options.yes) {
      console.log(chalk.yellow(`About to delete dev resource ${id} from file ${fileKey}`));
      console.log('This action cannot be undone.');
      
      // Simple confirmation (in a real app, you'd use a proper prompt library)
      const confirmation = await new Promise((resolve) => {
        process.stdout.write('Continue? (y/N): ');
        process.stdin.once('data', (data) => {
          resolve(data.toString().trim().toLowerCase() === 'y');
        });
      });

      if (!confirmation) {
        console.log('Operation cancelled');
        process.exit(0);
      }
    }

    const spinner = ora('Deleting dev resource...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      await sdk.deleteDevResource(fileKey, id);
      spinner.succeed('Dev resource deleted');
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Search command
program
  .command('search <file-key> <pattern>')
  .description('Search dev resources by name pattern')
  .option('--format <format>', 'Output format (json, table)', 'json')
  .action(async (fileKey, pattern, options, command) => {
    const spinner = ora('Searching dev resources...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const resources = await sdk.searchDevResources(fileKey, pattern);
      spinner.succeed(`Found ${resources.length} matching dev resources`);
      
      if (options.format === 'table' && resources.length > 0) {
        console.table(resources.map(r => ({
          ID: r.id,
          Name: r.name,
          URL: r.url,
          'Node ID': r.node_id
        })));
      } else {
        console.log(formatOutput(resources, options.format));
      }
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats <file-key>')
  .description('Get statistics about dev resources in a file')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Calculating statistics...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const stats = await sdk.getDevResourcesStats(fileKey);
      spinner.succeed('Statistics calculated');
      
      console.log(chalk.bold('\nDev Resources Statistics'));
      console.log(chalk.blue(`Total resources: ${stats.total}`));
      console.log(chalk.blue(`Nodes with resources: ${stats.nodesWithResources}`));
      console.log(chalk.blue(`Unique domains: ${stats.domains}`));
      
      console.log('\nResources by Node:');
      Object.entries(stats.byNode)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([node, count]) => {
          console.log(`  ${node}: ${count} resources`);
        });
      
      console.log('\nResources by Domain:');
      Object.entries(stats.byDomain)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([domain, count]) => {
          console.log(`  ${domain}: ${count} resources`);
        });
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Validate URLs command
program
  .command('validate <file-key>')
  .description('Validate dev resource URLs')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Validating dev resource URLs...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const invalidResources = await sdk.validateDevResourceUrls(fileKey);
      
      if (invalidResources.length === 0) {
        spinner.succeed('All dev resource URLs are valid');
      } else {
        spinner.warn(`Found ${invalidResources.length} invalid URLs`);
        console.log(formatOutput(invalidResources.map(r => ({
          id: r.id,
          name: r.name,
          url: r.url,
          error: r.error
        }))));
      }
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Sync command
program
  .command('sync <file-key>')
  .description('Sync dev resources from JSON file or stdin')
  .option('-f, --file <file>', 'JSON file containing target resources')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Syncing dev resources...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      let targetResources;
      
      if (options.file) {
        const fileContent = readFileSync(options.file, 'utf8');
        targetResources = parseJsonInput(fileContent);
      } else {
        // Read from stdin
        let stdinData = '';
        for await (const chunk of process.stdin) {
          stdinData += chunk;
        }
        targetResources = parseJsonInput(stdinData);
      }

      if (!Array.isArray(targetResources)) {
        throw new Error('Input must be an array of resource objects');
      }

      const results = await sdk.syncFileDevResources(fileKey, targetResources);
      
      spinner.succeed('Sync completed');
      
      console.log(chalk.green(`Created: ${results.created.length} resources`));
      console.log(chalk.blue(`Updated: ${results.updated.length} resources`));
      console.log(chalk.red(`Deleted: ${results.deleted.length} resources`));
      
      if (results.errors.length > 0) {
        console.log(chalk.yellow(`Errors: ${results.errors.length}`));
        console.log(formatOutput(results.errors));
      }
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Error handling for unhandled promises
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});

// Parse arguments
program.parse();