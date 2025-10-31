#!/usr/bin/env node

/**
 * CLI interface for figma-projects
 * Provides command-line access to Figma Projects API functionality
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import FigmaProjectsSDK from './sdk.mjs';

const program = new Command();

// Configure CLI
program
  .name('figma-projects')
  .description('CLI for Figma Projects API')
  .version('1.0.0')
  .option('-t, --token <token>', 'Figma API token (or set FIGMA_TOKEN env var)')
  .option('-v, --verbose', 'Verbose output')
  .option('--timeout <ms>', 'Request timeout in milliseconds', '30000')
  .option('--max-retries <count>', 'Maximum retry attempts', '3')
  .option('--no-cache', 'Disable response caching')
  .option('--no-metrics', 'Disable request metrics')
  .option('--format <format>', 'Output format (json, table)', 'json');

// Helper to get SDK instance
function getSDK(options, command) {
  const globalOpts = command.optsWithGlobals();
  const apiToken = globalOpts.token || process.env.FIGMA_TOKEN;

  if (!apiToken) {
    console.error(chalk.red('Error: Figma API token is required'));
    console.error('Set via --token flag or FIGMA_TOKEN environment variable');
    console.error('Get a token from: https://www.figma.com/developers/api#access-tokens');
    process.exit(1);
  }

  return new FigmaProjectsSDK({
    apiToken,
    timeout: parseInt(globalOpts.timeout, 10),
    maxRetries: parseInt(globalOpts.maxRetries, 10),
    enableCache: globalOpts.cache !== false,
    enableMetrics: globalOpts.metrics !== false,
    logger: globalOpts.verbose ? console : { debug: () => {}, warn: () => {}, error: console.error }
  });
}

// Helper to format and display output
function displayOutput(data, format, title) {
  if (title) {
    console.log(chalk.bold.blue(`\n${title}\n`));
  }

  if (format === 'table' && data && typeof data === 'object') {
    displayAsTable(data);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Helper to display data as a simple table
function displayAsTable(data) {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      console.log(chalk.yellow('No results found'));
      return;
    }

    // Display array as simple list
    data.forEach((item, index) => {
      console.log(chalk.cyan(`${index + 1}.`), item.name || item.id || JSON.stringify(item));
    });
  } else if (data.projects && Array.isArray(data.projects)) {
    // Display projects
    console.log(chalk.bold(`Team: ${data.team?.name || 'Unknown'}`));
    console.log(chalk.bold(`Total Projects: ${data.totalCount || data.projects.length}\n`));

    data.projects.forEach((project, index) => {
      console.log(chalk.cyan(`${index + 1}. ${project.name}`));
      console.log(`   ID: ${project.id}`);
      if (project.statistics) {
        console.log(`   Files: ${project.statistics.fileCount}`);
        console.log(`   Last Modified: ${project.statistics.lastModified || 'Unknown'}`);
      }
      console.log();
    });
  } else if (data.files && Array.isArray(data.files)) {
    // Display files
    console.log(chalk.bold(`Project: ${data.project?.name || 'Unknown'}`));
    console.log(chalk.bold(`Total Files: ${data.totalCount || data.files.length}\n`));

    data.files.forEach((file, index) => {
      console.log(chalk.cyan(`${index + 1}. ${file.name}`));
      console.log(`   Key: ${file.key}`);
      console.log(`   Last Modified: ${file.lastModified}`);
      if (file.enriched?.daysSinceModified !== undefined) {
        const days = file.enriched.daysSinceModified;
        const color = days <= 1 ? 'green' : days <= 7 ? 'yellow' : 'red';
        console.log(`   Age: ${chalk[color](`${days} days ago`)}`);
      }
      console.log();
    });
  } else {
    // Fallback to JSON
    console.log(JSON.stringify(data, null, 2));
  }
}

// Helper to handle command errors
function handleCommandError(error, operation) {
  console.error(chalk.red(`\nError during ${operation}:`));
  console.error(chalk.red(error.message));
  
  if (error.code) {
    console.error(chalk.yellow(`Error Code: ${error.code}`));
  }
  
  if (error.meta && Object.keys(error.meta).length > 0) {
    console.error(chalk.gray('Additional details:'));
    console.error(chalk.gray(JSON.stringify(error.meta, null, 2)));
  }
  
  process.exit(1);
}

// List projects command
program
  .command('list-projects')
  .description('List all projects in a team')
  .requiredOption('--team-id <id>', 'Team ID')
  .option('--include-stats', 'Include project statistics')
  .action(async (options, command) => {
    const spinner = ora('Fetching team projects...').start();
    const sdk = getSDK(options, command);
    const globalOpts = command.optsWithGlobals();

    try {
      const result = await sdk.getTeamProjects(options.teamId, {
        includeStats: options.includeStats
      });
      
      spinner.succeed(`Found ${result.totalCount} projects`);
      displayOutput(result, globalOpts.format, `Projects in ${result.team.name}`);
    } catch (error) {
      spinner.fail('Failed to fetch projects');
      handleCommandError(error, 'list-projects');
    }
  });

// List files command
program
  .command('list-files')
  .description('List all files in a project')
  .requiredOption('--project-id <id>', 'Project ID')
  .option('--branch-data', 'Include branch metadata')
  .action(async (options, command) => {
    const spinner = ora('Fetching project files...').start();
    const sdk = getSDK(options, command);
    const globalOpts = command.optsWithGlobals();

    try {
      const result = await sdk.getProjectFiles(options.projectId, {
        branchData: options.branchData
      });
      
      spinner.succeed(`Found ${result.totalCount} files`);
      displayOutput(result, globalOpts.format, `Files in ${result.project.name}`);
    } catch (error) {
      spinner.fail('Failed to fetch files');
      handleCommandError(error, 'list-files');
    }
  });

// Get project tree command
program
  .command('get-tree')
  .description('Get complete project tree (projects with files)')
  .requiredOption('--team-id <id>', 'Team ID')
  .option('--max-concurrency <count>', 'Maximum concurrent requests', '5')
  .option('--exclude-empty', 'Exclude projects with no files')
  .action(async (options, command) => {
    const spinner = ora('Building project tree...').start();
    const sdk = getSDK(options, command);
    const globalOpts = command.optsWithGlobals();

    try {
      const result = await sdk.getProjectTree(options.teamId, {
        maxConcurrency: parseInt(options.maxConcurrency, 10),
        includeEmptyProjects: !options.excludeEmpty
      });
      
      spinner.succeed(`Built tree with ${result.totalProjects} projects and ${result.totalFiles} files`);
      displayOutput(result, globalOpts.format, `Project Tree for ${result.team.name}`);
    } catch (error) {
      spinner.fail('Failed to build project tree');
      handleCommandError(error, 'get-tree');
    }
  });

// Search projects command
program
  .command('search')
  .description('Search for projects by name')
  .requiredOption('--team-id <id>', 'Team ID')
  .requiredOption('--query <query>', 'Search query')
  .option('--case-sensitive', 'Case sensitive search')
  .option('--exact-match', 'Exact match only')
  .action(async (options, command) => {
    const spinner = ora(`Searching for "${options.query}"...`).start();
    const sdk = getSDK(options, command);
    const globalOpts = command.optsWithGlobals();

    try {
      const result = await sdk.searchProjects(options.teamId, options.query, {
        caseSensitive: options.caseSensitive,
        exactMatch: options.exactMatch
      });
      
      spinner.succeed(`Found ${result.totalMatches} matches out of ${result.totalProjects} projects`);
      displayOutput(result.results, globalOpts.format, `Search Results for "${options.query}"`);
    } catch (error) {
      spinner.fail('Search failed');
      handleCommandError(error, 'search');
    }
  });

// Project statistics command
program
  .command('stats')
  .description('Get project statistics')
  .requiredOption('--project-id <id>', 'Project ID')
  .action(async (options, command) => {
    const spinner = ora('Calculating project statistics...').start();
    const sdk = getSDK(options, command);
    const globalOpts = command.optsWithGlobals();

    try {
      const result = await sdk.getProjectStats(options.projectId);
      
      spinner.succeed('Statistics calculated');
      
      if (globalOpts.format === 'table') {
        console.log(chalk.bold.blue(`\nProject Statistics\n`));
        console.log(chalk.cyan('Project:'), result.projectName);
        console.log(chalk.cyan('Project ID:'), result.projectId);
        console.log(chalk.cyan('Total Files:'), result.fileCount);
        console.log(chalk.cyan('Last Modified:'), result.lastModified);
        
        if (result.oldestFile) {
          console.log(chalk.cyan('Oldest File:'), `${result.oldestFile.name} (${result.oldestFile.lastModified})`);
        }
        
        if (result.newestFile) {
          console.log(chalk.cyan('Newest File:'), `${result.newestFile.name} (${result.newestFile.lastModified})`);
        }
        
        if (result.activitySummary) {
          console.log(chalk.bold('\nActivity Summary:'));
          console.log(chalk.cyan('  Last Week:'), result.activitySummary.lastWeek);
          console.log(chalk.cyan('  Last Month:'), result.activitySummary.lastMonth);
          console.log(chalk.cyan('  Last Year:'), result.activitySummary.lastYear);
        }
      } else {
        displayOutput(result, globalOpts.format);
      }
    } catch (error) {
      spinner.fail('Failed to calculate statistics');
      handleCommandError(error, 'stats');
    }
  });

// Export command
program
  .command('export')
  .description('Export project structure')
  .requiredOption('--team-id <id>', 'Team ID')
  .option('--format <format>', 'Export format (json, csv)', 'json')
  .option('--output <file>', 'Output file (default: stdout)')
  .action(async (options, command) => {
    const spinner = ora(`Exporting project structure as ${options.format}...`).start();
    const sdk = getSDK(options, command);

    try {
      const result = await sdk.exportProjects(options.teamId, options.format);
      
      spinner.succeed('Export completed');
      
      if (options.output) {
        const fs = await import('fs');
        fs.writeFileSync(options.output, result);
        console.log(chalk.green(`Exported to: ${options.output}`));
      } else {
        console.log(result);
      }
    } catch (error) {
      spinner.fail('Export failed');
      handleCommandError(error, 'export');
    }
  });

// Find file command
program
  .command('find-file')
  .description('Find a file by name in a project')
  .requiredOption('--project-id <id>', 'Project ID')
  .requiredOption('--file-name <name>', 'File name to search for')
  .option('--case-sensitive', 'Case sensitive search')
  .option('--partial-match', 'Allow partial name matches')
  .action(async (options, command) => {
    const spinner = ora(`Searching for file "${options.fileName}"...`).start();
    const sdk = getSDK(options, command);
    const globalOpts = command.optsWithGlobals();

    try {
      const result = await sdk.findFile(options.projectId, options.fileName, {
        caseSensitive: options.caseSensitive,
        exactMatch: !options.partialMatch
      });
      
      spinner.succeed('File found');
      displayOutput(result, globalOpts.format, `File: ${result.name}`);
    } catch (error) {
      spinner.fail('File not found or search failed');
      handleCommandError(error, 'find-file');
    }
  });

// Recent files command
program
  .command('recent')
  .description('Get recently modified files')
  .requiredOption('--team-id <id>', 'Team ID')
  .option('--limit <count>', 'Maximum number of files to return', '10')
  .option('--days <count>', 'Number of days to look back', '7')
  .action(async (options, command) => {
    const spinner = ora('Fetching recent files...').start();
    const sdk = getSDK(options, command);
    const globalOpts = command.optsWithGlobals();

    try {
      const result = await sdk.getRecentFiles(
        options.teamId,
        parseInt(options.limit, 10),
        parseInt(options.days, 10)
      );
      
      spinner.succeed(`Found ${result.totalFound} recent files`);
      
      if (globalOpts.format === 'table') {
        console.log(chalk.bold.blue(`\nRecent Files (last ${options.days} days)\n`));
        result.files.forEach((file, index) => {
          console.log(chalk.cyan(`${index + 1}. ${file.name}`));
          console.log(`   Project: ${file.projectName}`);
          console.log(`   Last Modified: ${file.lastModified}`);
          console.log(`   Key: ${file.key}`);
          console.log();
        });
      } else {
        displayOutput(result, globalOpts.format);
      }
    } catch (error) {
      spinner.fail('Failed to fetch recent files');
      handleCommandError(error, 'recent');
    }
  });

// Health check command
program
  .command('health')
  .description('Check API connectivity and authentication')
  .action(async (options, command) => {
    const spinner = ora('Checking API health...').start();
    const sdk = getSDK(options, command);
    const globalOpts = command.optsWithGlobals();

    try {
      const result = await sdk.healthCheck();
      
      if (result.status === 'healthy') {
        spinner.succeed('API is healthy');
        
        if (globalOpts.format === 'table') {
          console.log(chalk.bold.green('\n✓ API Health Check Passed\n'));
          console.log(chalk.cyan('Status:'), chalk.green(result.status));
          console.log(chalk.cyan('Authentication:'), chalk.green(result.authentication));
          console.log(chalk.cyan('API Connectivity:'), chalk.green(result.apiConnectivity));
          console.log(chalk.cyan('Timestamp:'), result.timestamp);
          
          if (result.rateLimit) {
            console.log(chalk.cyan('Rate Limit:'), `${result.rateLimit.requestsRemaining}/${result.rateLimit.totalRequests} remaining`);
          }
        } else {
          displayOutput(result, globalOpts.format);
        }
      } else {
        spinner.fail('API is unhealthy');
        console.error(chalk.red('\n✗ API Health Check Failed\n'));
        console.error(chalk.red('Error:'), result.error);
        process.exit(1);
      }
    } catch (error) {
      spinner.fail('Health check failed');
      handleCommandError(error, 'health');
    }
  });

// Metrics command
program
  .command('metrics')
  .description('Show SDK performance metrics')
  .action(async (options, command) => {
    const sdk = getSDK(options, command);
    const globalOpts = command.optsWithGlobals();

    try {
      const metrics = sdk.getMetrics();
      
      if (globalOpts.format === 'table') {
        console.log(chalk.bold.blue('\nSDK Metrics\n'));
        
        if (metrics.client) {
          console.log(chalk.bold('Request Metrics:'));
          console.log(chalk.cyan('  Total Requests:'), metrics.client.totalRequests);
          console.log(chalk.cyan('  Success Rate:'), `${(metrics.client.successRate * 100).toFixed(1)}%`);
          console.log(chalk.cyan('  Average Response Time:'), `${metrics.client.averageResponseTime.toFixed(0)}ms`);
          console.log(chalk.cyan('  Cache Hit Rate:'), `${(metrics.client.cacheHitRate * 100).toFixed(1)}%`);
          console.log();
        }
        
        if (metrics.rateLimit) {
          console.log(chalk.bold('Rate Limiting:'));
          console.log(chalk.cyan('  Requests Remaining:'), metrics.rateLimit.requestsRemaining);
          console.log(chalk.cyan('  Total Allowed:'), metrics.rateLimit.totalRequests);
          console.log();
        }
        
        console.log(chalk.cyan('Generated:'), metrics.timestamp);
      } else {
        displayOutput(metrics, globalOpts.format, 'SDK Metrics');
      }
    } catch (error) {
      handleCommandError(error, 'metrics');
    }
  });

// Team overview command
program
  .command('overview')
  .description('Get comprehensive team overview')
  .requiredOption('--team-id <id>', 'Team ID')
  .option('--no-stats', 'Exclude project statistics')
  .option('--no-recent', 'Exclude recent files')
  .option('--recent-limit <count>', 'Limit for recent files', '20')
  .action(async (options, command) => {
    const spinner = ora('Generating team overview...').start();
    const sdk = getSDK(options, command);
    const globalOpts = command.optsWithGlobals();

    try {
      const result = await sdk.getTeamOverview(options.teamId, {
        includeStats: options.stats !== false,
        includeRecentFiles: options.recent !== false,
        recentFilesLimit: parseInt(options.recentLimit, 10)
      });
      
      spinner.succeed('Team overview generated');
      
      if (globalOpts.format === 'table') {
        console.log(chalk.bold.blue(`\nTeam Overview: ${result.team.name}\n`));
        
        console.log(chalk.bold('Summary:'));
        console.log(chalk.cyan('  Total Projects:'), result.summary.totalProjects);
        console.log(chalk.cyan('  Total Files:'), result.summary.totalFiles);
        console.log(chalk.cyan('  Active Projects:'), `${result.summary.activeProjects} (${result.summary.activeProjectsPercentage.toFixed(1)}%)`);
        console.log();
        
        if (result.recentFiles && result.recentFiles.length > 0) {
          console.log(chalk.bold('Recent Activity:'));
          result.recentFiles.slice(0, 5).forEach((file, index) => {
            console.log(chalk.cyan(`  ${index + 1}. ${file.name}`), chalk.gray(`(${file.projectName})`));
          });
          console.log();
        }
        
        console.log(chalk.gray(`Generated: ${result.metadata.generatedAt}`));
      } else {
        displayOutput(result, globalOpts.format);
      }
    } catch (error) {
      spinner.fail('Failed to generate overview');
      handleCommandError(error, 'overview');
    }
  });

// Parse arguments and handle global errors
try {
  program.parse();
} catch (error) {
  console.error(chalk.red('\nUnexpected error:'));
  console.error(chalk.red(error.message));
  process.exit(1);
}

// Handle case where no command was provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}