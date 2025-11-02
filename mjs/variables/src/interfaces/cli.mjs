#!/usr/bin/env node

/**
 * CLI interface for figma-variables-sdk
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { FigmaApiClient } from '@figma-api/fetch';
import { FigmaVariablesSDK } from './sdk.mjs';

const program = new Command();

// Configure CLI
program
  .name('figma-variables')
  .description('CLI for Figma Variables API (Enterprise only)')
  .version('1.0.0')
  .option('-t, --access-token <token>', 'Figma access token (or set FIGMA_ACCESS_TOKEN env var)')
  .option('-b, --base-url <url>', 'API base URL', 'https://api.figma.com')
  .option('-v, --verbose', 'Verbose output')
  .option('--timeout <ms>', 'Request timeout in milliseconds', '30000');

// Helper to get SDK instance
function getSDK(options) {
  const accessToken = options.accessToken || process.env.FIGMA_ACCESS_TOKEN;

  if (!accessToken) {
    console.error(chalk.red('Error: Figma access token is required'));
    console.error('Set via --access-token flag or FIGMA_ACCESS_TOKEN environment variable');
    console.error(chalk.yellow('Note: Variables API requires Enterprise organization access'));
    process.exit(1);
  }

  // Create fetcher with HTTP configuration
  const fetcher = new FigmaApiClient({
    apiToken: accessToken,
    baseUrl: options.baseUrl || 'https://api.figma.com',
    timeout: parseInt(options.timeout, 10) || 30000,
    logger: options.verbose ? console : undefined
  });

  // Create SDK with fetcher dependency injection
  return new FigmaVariablesSDK({
    fetcher,
    logger: options.verbose ? console : { debug: () => {}, error: console.error, warn: console.warn }
  });
}

// Helper to format output
function formatOutput(data, format = 'json') {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }
  return data;
}

// Test connection command
program
  .command('test <file-key>')
  .description('Test connection and permissions for a file')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Testing connection...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const result = await sdk.testConnection(fileKey);
      
      if (result.success) {
        spinner.succeed('Connection successful');
        console.log(chalk.green('✓ Enterprise API access confirmed'));
        console.log(chalk.blue(`Variables: ${result.stats?.variableCount || 0}`));
        console.log(chalk.blue(`Collections: ${result.stats?.collectionCount || 0}`));
      } else {
        spinner.fail('Connection failed');
        console.error(chalk.red(`Error: ${result.error}`));
        if (result.code === 'ENTERPRISE_ACCESS_ERROR') {
          console.error(chalk.yellow('Note: Variables API requires Enterprise organization access'));
        }
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Get variables command
program
  .command('get <file-key>')
  .description('Get all variables and collections from a file')
  .option('--published', 'Get published variables instead of local')
  .option('--format <format>', 'Output format (json)', 'json')
  .action(async (fileKey, options, command) => {
    const spinner = ora(`Fetching ${options.published ? 'published' : 'local'} variables...`).start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const result = options.published 
        ? await sdk.getPublishedVariables(fileKey)
        : await sdk.getVariables(fileKey);
        
      spinner.succeed(`Fetched ${result.stats.variableCount} variables from ${result.stats.collectionCount} collections`);
      console.log(formatOutput(result, options.format));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (error.code === 'ENTERPRISE_ACCESS_ERROR') {
        console.error(chalk.yellow('Note: Variables API requires Enterprise organization access'));
      }
      process.exit(1);
    }
  });

// Get specific variable command
program
  .command('get-variable <file-key> <variable-id>')
  .description('Get a specific variable by ID')
  .option('--format <format>', 'Output format (json)', 'json')
  .action(async (fileKey, variableId, options, command) => {
    const spinner = ora('Fetching variable...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const variable = await sdk.getVariable(fileKey, variableId);
      spinner.succeed('Variable fetched');
      console.log(formatOutput(variable, options.format));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Search variables command
program
  .command('search <file-key>')
  .description('Search for variables by criteria')
  .option('-n, --name <name>', 'Search by name (partial match)')
  .option('-t, --type <type>', 'Filter by type (BOOLEAN, FLOAT, STRING, COLOR)')
  .option('-c, --collection <id>', 'Filter by collection ID')
  .option('--format <format>', 'Output format (json)', 'json')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Searching variables...').start();
    const sdk = getSDK(command.optsWithGlobals());

    const criteria = {};
    if (options.name) criteria.name = options.name;
    if (options.type) criteria.type = options.type;
    if (options.collection) criteria.collectionId = options.collection;

    if (Object.keys(criteria).length === 0) {
      spinner.fail('At least one search criterion is required');
      process.exit(1);
    }

    try {
      const results = await sdk.searchVariables(fileKey, criteria);
      spinner.succeed(`Found ${results.length} matching variables`);
      console.log(formatOutput(results, options.format));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Create collection command
program
  .command('create-collection <file-key> <name>')
  .description('Create a new variable collection')
  .option('--mode-name <name>', 'Initial mode name', 'Mode 1')
  .action(async (fileKey, name, options, command) => {
    const spinner = ora('Creating collection...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const result = await sdk.createCollection(fileKey, name, {
        initialMode: { name: options.modeName }
      });
      spinner.succeed('Collection created');
      console.log(formatOutput(result));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Create variable command
program
  .command('create-variable <file-key>')
  .description('Create a new variable')
  .requiredOption('-n, --name <name>', 'Variable name')
  .requiredOption('-c, --collection <id>', 'Collection ID')
  .requiredOption('-t, --type <type>', 'Variable type (BOOLEAN, FLOAT, STRING, COLOR)')
  .option('-m, --mode <id>', 'Mode ID for initial value')
  .option('-v, --value <value>', 'Initial value (JSON string for complex types)')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Creating variable...').start();
    const sdk = getSDK(command.optsWithGlobals());

    const variableConfig = {
      name: options.name,
      variableCollectionId: options.collection,
      resolvedType: options.type
    };

    // Add initial value if provided
    if (options.mode && options.value !== undefined) {
      let value = options.value;
      
      // Parse JSON for complex types
      if (options.type === 'COLOR' || options.value.startsWith('{')) {
        try {
          value = JSON.parse(options.value);
        } catch (error) {
          spinner.fail('Invalid JSON value provided');
          process.exit(1);
        }
      } else if (options.type === 'FLOAT') {
        value = parseFloat(options.value);
      } else if (options.type === 'BOOLEAN') {
        value = options.value.toLowerCase() === 'true';
      }

      variableConfig.values = { [options.mode]: value };
    }

    try {
      const result = await sdk.createVariable(fileKey, variableConfig);
      spinner.succeed('Variable created');
      console.log(formatOutput(result));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Update variable command
program
  .command('update-variable <file-key> <variable-id>')
  .description('Update an existing variable')
  .option('-n, --name <name>', 'New variable name')
  .option('-d, --description <desc>', 'New description')
  .requiredOption('-u, --updates <json>', 'Updates as JSON string')
  .action(async (fileKey, variableId, options, command) => {
    const spinner = ora('Updating variable...').start();
    const sdk = getSDK(command.optsWithGlobals());

    let updates;
    try {
      updates = JSON.parse(options.updates);
    } catch (error) {
      spinner.fail('Invalid JSON updates provided');
      process.exit(1);
    }

    try {
      const result = await sdk.updateVariable(fileKey, variableId, updates);
      spinner.succeed('Variable updated');
      console.log(formatOutput(result));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Delete variable command
program
  .command('delete-variable <file-key> <variable-id>')
  .description('Delete a variable')
  .option('--confirm', 'Confirm deletion (required)')
  .action(async (fileKey, variableId, options, command) => {
    if (!options.confirm) {
      console.error(chalk.red('Error: Deletion must be confirmed with --confirm flag'));
      process.exit(1);
    }

    const spinner = ora('Deleting variable...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const result = await sdk.deleteVariable(fileKey, variableId);
      spinner.succeed('Variable deleted');
      console.log(formatOutput(result));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Export variables command
program
  .command('export <file-key>')
  .description('Export all variables to a structured format')
  .option('-o, --output <file>', 'Output file path (default: stdout)')
  .option('--format <format>', 'Output format (json)', 'json')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Exporting variables...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const data = await sdk.exportVariables(fileKey);
      spinner.succeed(`Exported ${data.variables.length} variables from ${data.collections.length} collections`);
      
      const output = formatOutput(data, options.format);
      
      if (options.output) {
        const fs = await import('fs');
        fs.writeFileSync(options.output, output);
        console.log(chalk.green(`Exported to ${options.output}`));
      } else {
        console.log(output);
      }
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Import variables command
program
  .command('import <file-key> <input-file>')
  .description('Import variables from a JSON file')
  .action(async (fileKey, inputFile, options, command) => {
    const spinner = ora('Importing variables...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const fs = await import('fs');
      const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
      
      const result = await sdk.importVariables(fileKey, data);
      
      const successCount = result.collections.length + result.variables.length;
      const errorCount = result.errors.length;
      
      if (errorCount > 0) {
        spinner.warn(`Import completed with ${errorCount} errors`);
        console.log(chalk.yellow('Errors:'));
        result.errors.forEach(error => {
          console.log(chalk.red(`- ${error.type}: ${error.error}`));
        });
      } else {
        spinner.succeed('Import completed successfully');
      }
      
      console.log(chalk.green(`Successfully imported ${successCount} items`));
      console.log(formatOutput(result));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Create alias command
program
  .command('create-alias <file-key> <alias-variable-id> <target-variable-id> <mode-id>')
  .description('Create an alias between variables')
  .action(async (fileKey, aliasVariableId, targetVariableId, modeId, options, command) => {
    const spinner = ora('Creating alias...').start();
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const result = await sdk.createAlias(fileKey, aliasVariableId, targetVariableId, modeId);
      spinner.succeed('Alias created');
      console.log(formatOutput(result));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Get SDK stats command
program
  .command('stats')
  .description('Get SDK statistics and configuration')
  .action(async (options, command) => {
    const sdk = getSDK(command.optsWithGlobals());
    const stats = sdk.getStats();
    console.log(formatOutput(stats));
  });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}