#!/usr/bin/env node

/**
 * CLI interface for figma-library-analytics
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { FigmaLibraryAnalyticsSDK } from './sdk.mjs';

const program = new Command();

// Configure CLI
program
  .name('figma-library-analytics')
  .description('CLI for Figma Library Analytics API')
  .version('1.0.0')
  .option('-t, --token <token>', 'Figma API token (or set FIGMA_TOKEN env var)')
  .option('-b, --base-url <url>', 'API base URL', 'https://api.figma.com')
  .option('-v, --verbose', 'Verbose output')
  .option('--json', 'Output as JSON');

// Helper to get SDK instance
function getSDK(options) {
  const token = options.token || process.env.FIGMA_TOKEN;

  if (!token) {
    console.error(chalk.red('Error: Figma API token is required'));
    console.error('Set via --token flag or FIGMA_TOKEN environment variable');
    console.error('Get your token at: https://www.figma.com/developers/api#access-tokens');
    console.error(chalk.yellow('Note: Token must have library_analytics:read scope'));
    process.exit(1);
  }

  return new FigmaLibraryAnalyticsSDK({
    apiToken: token,
    baseUrl: options.baseUrl,
    logger: options.verbose ? console : { debug: () => {}, log: () => {}, error: console.error }
  });
}

// Helper to format output
function formatOutput(data, options) {
  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
  } else if (Array.isArray(data)) {
    if (data.length === 0) {
      console.log(chalk.gray('No data found'));
    } else {
      data.forEach((item, index) => {
        console.log(`${index + 1}. ${formatAnalyticsItem(item)}`);
      });
    }
  } else {
    console.log(formatAnalyticsData(data));
  }
}

// Helper to format analytics item for display
function formatAnalyticsItem(item) {
  if (item.component_name || item.style_name || item.variable_name) {
    const name = item.component_name || item.style_name || item.variable_name;
    const actions = item.action_count || 0;
    const usages = item.usage_count || 0;
    return `${chalk.blue(name)} | Actions: ${chalk.green(actions)} | Usages: ${chalk.yellow(usages)}`;
  }

  if (item.team_name) {
    return `${chalk.blue(item.team_name)} | Actions: ${chalk.green(item.action_count || 0)}`;
  }

  if (item.file_name) {
    return `${chalk.blue(item.file_name)} | Usages: ${chalk.yellow(item.usage_count || 0)}`;
  }

  return JSON.stringify(item);
}

// Helper to format analytics data
function formatAnalyticsData(data) {
  if (data.summary) {
    // Health report format
    const summary = data.summary;
    return [
      chalk.bold.blue('Library Health Report'),
      `File: ${chalk.white(data.fileKey)}`,
      `Period: ${chalk.white(data.period)}`,
      `Health Score: ${getHealthScoreColor(summary.healthScore)}${summary.healthScore}/100`,
      `Total Assets: ${chalk.white(summary.totalAssets)}`,
      `Active Assets: ${chalk.green(summary.activeAssets)}`,
      `Adoption Rate: ${chalk.yellow(Math.round(summary.adoptionRate * 100))}%`,
      `Total Usages: ${chalk.cyan(summary.totalUsages)}`
    ].join('\n');
  }

  if (data.totalComponents !== undefined) {
    // Component metrics format
    return [
      chalk.bold.green('Component Analytics'),
      `Total Components: ${chalk.white(data.totalComponents)}`,
      `Active Components: ${chalk.green(data.activeComponents)}`,
      `Total Actions: ${chalk.cyan(data.totalActions)}`,
      `Total Usages: ${chalk.yellow(data.totalUsages)}`,
      `Avg Actions/Component: ${chalk.gray(Math.round(data.avgActionsPerComponent))}`,
      `Avg Usages/Component: ${chalk.gray(Math.round(data.avgUsagesPerComponent))}`
    ].join('\n');
  }

  if (data.totalStyles !== undefined) {
    // Style metrics format
    return [
      chalk.bold.magenta('Style Analytics'),
      `Total Styles: ${chalk.white(data.totalStyles)}`,
      `Active Styles: ${chalk.green(data.activeStyles)}`,
      `Total Actions: ${chalk.cyan(data.totalActions)}`,
      `Total Usages: ${chalk.yellow(data.totalUsages)}`,
      `Avg Actions/Style: ${chalk.gray(Math.round(data.avgActionsPerStyle))}`,
      `Avg Usages/Style: ${chalk.gray(Math.round(data.avgUsagesPerStyle))}`
    ].join('\n');
  }

  if (data.totalVariables !== undefined) {
    // Variable metrics format
    return [
      chalk.bold.cyan('Variable Analytics'),
      `Total Variables: ${chalk.white(data.totalVariables)}`,
      `Active Variables: ${chalk.green(data.activeVariables)}`,
      `Total Actions: ${chalk.cyan(data.totalActions)}`,
      `Total Usages: ${chalk.yellow(data.totalUsages)}`,
      `Avg Actions/Variable: ${chalk.gray(Math.round(data.avgActionsPerVariable))}`,
      `Avg Usages/Variable: ${chalk.gray(Math.round(data.avgUsagesPerVariable))}`
    ].join('\n');
  }

  return JSON.stringify(data, null, 2);
}

// Helper to get health score color
function getHealthScoreColor(score) {
  if (score >= 80) return chalk.green;
  if (score >= 60) return chalk.yellow;
  return chalk.red;
}

// === Component Analytics Commands ===

// Component actions
program
  .command('component-actions <file-key>')
  .description('Get component action analytics')
  .requiredOption('-g, --group-by <dimension>', 'Group by dimension (component, team)')
  .option('-s, --start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('-e, --end-date <date>', 'End date (YYYY-MM-DD)')
  .option('-c, --cursor <cursor>', 'Pagination cursor')
  .option('--all', 'Get all data (paginate through all results)')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Fetching component action analytics...').start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      let result;
      if (options.all) {
        result = await sdk.getAllData(sdk.getComponentActions, fileKey, {
          groupBy: options.groupBy,
          startDate: options.startDate,
          endDate: options.endDate
        });
        spinner.succeed(`Retrieved ${result.length} component action records`);
      } else {
        result = await sdk.getComponentActions(fileKey, {
          groupBy: options.groupBy,
          startDate: options.startDate,
          endDate: options.endDate,
          cursor: options.cursor
        });
        const count = result.component_actions?.length || 0;
        spinner.succeed(`Retrieved ${count} component action records`);
        result = result.component_actions || [];
      }

      formatOutput(result, globalOpts);
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Component usages
program
  .command('component-usages <file-key>')
  .description('Get component usage analytics')
  .requiredOption('-g, --group-by <dimension>', 'Group by dimension (component, file)')
  .option('-c, --cursor <cursor>', 'Pagination cursor')
  .option('--all', 'Get all data (paginate through all results)')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Fetching component usage analytics...').start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      let result;
      if (options.all) {
        result = await sdk.getAllData(sdk.getComponentUsages, fileKey, {
          groupBy: options.groupBy
        });
        spinner.succeed(`Retrieved ${result.length} component usage records`);
      } else {
        result = await sdk.getComponentUsages(fileKey, {
          groupBy: options.groupBy,
          cursor: options.cursor
        });
        const count = result.component_usages?.length || 0;
        spinner.succeed(`Retrieved ${count} component usage records`);
        result = result.component_usages || [];
      }

      formatOutput(result, globalOpts);
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Component adoption
program
  .command('component-adoption <file-key>')
  .description('Get component adoption metrics')
  .option('-p, --period <period>', 'Time period (lastWeek, lastMonth, lastQuarter)', 'lastMonth')
  .option('--no-usage', 'Exclude usage data')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Analyzing component adoption...').start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      const result = await sdk.getComponentAdoption(fileKey, {
        period: options.period,
        includeUsage: options.usage !== false
      });
      
      spinner.succeed('Component adoption analysis complete');
      formatOutput(result, globalOpts);
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Component leaderboard
program
  .command('component-leaderboard <file-key>')
  .description('Get component performance leaderboard')
  .option('-l, --limit <number>', 'Number of top components', '10')
  .option('-s, --sort-by <field>', 'Sort criteria', 'total_usage')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Generating component leaderboard...').start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      const result = await sdk.getComponentLeaderboard(fileKey, {
        limit: parseInt(options.limit),
        sortBy: options.sortBy
      });
      
      spinner.succeed(`Top ${result.length} components`);
      formatOutput(result, globalOpts);
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// === Style Analytics Commands ===

// Style actions
program
  .command('style-actions <file-key>')
  .description('Get style action analytics')
  .requiredOption('-g, --group-by <dimension>', 'Group by dimension (style, team)')
  .option('-s, --start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('-e, --end-date <date>', 'End date (YYYY-MM-DD)')
  .option('-c, --cursor <cursor>', 'Pagination cursor')
  .option('--all', 'Get all data (paginate through all results)')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Fetching style action analytics...').start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      let result;
      if (options.all) {
        result = await sdk.getAllData(sdk.getStyleActions, fileKey, {
          groupBy: options.groupBy,
          startDate: options.startDate,
          endDate: options.endDate
        });
        spinner.succeed(`Retrieved ${result.length} style action records`);
      } else {
        result = await sdk.getStyleActions(fileKey, {
          groupBy: options.groupBy,
          startDate: options.startDate,
          endDate: options.endDate,
          cursor: options.cursor
        });
        const count = result.style_actions?.length || 0;
        spinner.succeed(`Retrieved ${count} style action records`);
        result = result.style_actions || [];
      }

      formatOutput(result, globalOpts);
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Style usages
program
  .command('style-usages <file-key>')
  .description('Get style usage analytics')
  .requiredOption('-g, --group-by <dimension>', 'Group by dimension (style, file)')
  .option('-c, --cursor <cursor>', 'Pagination cursor')
  .option('--all', 'Get all data (paginate through all results)')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Fetching style usage analytics...').start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      let result;
      if (options.all) {
        result = await sdk.getAllData(sdk.getStyleUsages, fileKey, {
          groupBy: options.groupBy
        });
        spinner.succeed(`Retrieved ${result.length} style usage records`);
      } else {
        result = await sdk.getStyleUsages(fileKey, {
          groupBy: options.groupBy,
          cursor: options.cursor
        });
        const count = result.style_usages?.length || 0;
        spinner.succeed(`Retrieved ${count} style usage records`);
        result = result.style_usages || [];
      }

      formatOutput(result, globalOpts);
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Style adoption
program
  .command('style-adoption <file-key>')
  .description('Get style adoption metrics')
  .option('-p, --period <period>', 'Time period (lastWeek, lastMonth, lastQuarter)', 'lastMonth')
  .option('--no-usage', 'Exclude usage data')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Analyzing style adoption...').start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      const result = await sdk.getStyleAdoption(fileKey, {
        period: options.period,
        includeUsage: options.usage !== false
      });
      
      spinner.succeed('Style adoption analysis complete');
      formatOutput(result, globalOpts);
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// === Variable Analytics Commands ===

// Variable actions
program
  .command('variable-actions <file-key>')
  .description('Get variable action analytics')
  .requiredOption('-g, --group-by <dimension>', 'Group by dimension (variable, team)')
  .option('-s, --start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('-e, --end-date <date>', 'End date (YYYY-MM-DD)')
  .option('-c, --cursor <cursor>', 'Pagination cursor')
  .option('--all', 'Get all data (paginate through all results)')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Fetching variable action analytics...').start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      let result;
      if (options.all) {
        result = await sdk.getAllData(sdk.getVariableActions, fileKey, {
          groupBy: options.groupBy,
          startDate: options.startDate,
          endDate: options.endDate
        });
        spinner.succeed(`Retrieved ${result.length} variable action records`);
      } else {
        result = await sdk.getVariableActions(fileKey, {
          groupBy: options.groupBy,
          startDate: options.startDate,
          endDate: options.endDate,
          cursor: options.cursor
        });
        const count = result.variable_actions?.length || 0;
        spinner.succeed(`Retrieved ${count} variable action records`);
        result = result.variable_actions || [];
      }

      formatOutput(result, globalOpts);
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Variable usages
program
  .command('variable-usages <file-key>')
  .description('Get variable usage analytics')
  .requiredOption('-g, --group-by <dimension>', 'Group by dimension (variable, file)')
  .option('-c, --cursor <cursor>', 'Pagination cursor')
  .option('--all', 'Get all data (paginate through all results)')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Fetching variable usage analytics...').start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      let result;
      if (options.all) {
        result = await sdk.getAllData(sdk.getVariableUsages, fileKey, {
          groupBy: options.groupBy
        });
        spinner.succeed(`Retrieved ${result.length} variable usage records`);
      } else {
        result = await sdk.getVariableUsages(fileKey, {
          groupBy: options.groupBy,
          cursor: options.cursor
        });
        const count = result.variable_usages?.length || 0;
        spinner.succeed(`Retrieved ${count} variable usage records`);
        result = result.variable_usages || [];
      }

      formatOutput(result, globalOpts);
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Variable adoption
program
  .command('variable-adoption <file-key>')
  .description('Get variable adoption metrics')
  .option('-p, --period <period>', 'Time period (lastWeek, lastMonth, lastQuarter)', 'lastMonth')
  .option('--no-usage', 'Exclude usage data')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Analyzing variable adoption...').start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      const result = await sdk.getVariableAdoption(fileKey, {
        period: options.period,
        includeUsage: options.usage !== false
      });
      
      spinner.succeed('Variable adoption analysis complete');
      formatOutput(result, globalOpts);
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// === Comprehensive Analytics Commands ===

// Health report
program
  .command('health-report <file-key>')
  .description('Get comprehensive library health report')
  .option('-p, --period <period>', 'Time period (lastWeek, lastMonth, lastQuarter)', 'lastMonth')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Generating library health report...').start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      const result = await sdk.getLibraryHealthReport(fileKey, {
        period: options.period
      });
      
      spinner.succeed('Library health report generated');
      formatOutput(result, globalOpts);

      // Show recommendations if not in JSON mode
      if (!globalOpts.json && result.recommendations && result.recommendations.length > 0) {
        console.log('\n' + chalk.bold.yellow('Recommendations:'));
        result.recommendations.forEach((rec, index) => {
          const priority = rec.priority === 'high' ? chalk.red('HIGH') : 
                          rec.priority === 'medium' ? chalk.yellow('MEDIUM') : 
                          chalk.gray('LOW');
          console.log(`${index + 1}. [${priority}] ${rec.message}`);
        });
      }
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Trends
program
  .command('trends <file-key>')
  .description('Get library adoption trends over time')
  .option('-p, --periods <periods>', 'Comma-separated time periods', 'lastWeek,lastMonth')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Analyzing library trends...').start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      const periods = options.periods.split(',').map(p => p.trim());
      const result = await sdk.getLibraryTrends(fileKey, { periods });
      
      spinner.succeed('Library trend analysis complete');
      formatOutput(result, globalOpts);
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// Multi-library comparison
program
  .command('compare <file-keys>')
  .description('Compare multiple libraries')
  .option('-p, --period <period>', 'Time period (lastWeek, lastMonth, lastQuarter)', 'lastMonth')
  .option('-m, --metric <metric>', 'Metric to compare (adoptionRate, healthScore, totalUsages)', 'adoptionRate')
  .action(async (fileKeysString, options, command) => {
    const fileKeys = fileKeysString.split(',').map(key => key.trim());
    const spinner = ora(`Comparing ${fileKeys.length} libraries...`).start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      const result = await sdk.compareLibraries(fileKeys, {
        period: options.period,
        metric: options.metric
      });
      
      spinner.succeed(`Library comparison complete (${options.metric})`);
      formatOutput(result, globalOpts);

      // Show rankings if not in JSON mode
      if (!globalOpts.json && result.rankings) {
        console.log('\n' + chalk.bold.blue('Rankings:'));
        console.log(`Best: ${chalk.green(result.rankings.best?.fileKey)} (${result.rankings.best?.score})`);
        console.log(`Worst: ${chalk.red(result.rankings.worst?.fileKey)} (${result.rankings.worst?.score})`);
        console.log(`Average: ${chalk.yellow(Math.round(result.rankings.average))}`);
      }
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// === Utility Commands ===

// Validate file key
program
  .command('validate <file-key>')
  .description('Validate library file key format')
  .action(async (fileKey, options, command) => {
    const sdk = getSDK(command.optsWithGlobals());

    try {
      const isValid = sdk.validateFileKey(fileKey);
      if (isValid) {
        console.log(chalk.green(`✓ File key '${fileKey}' is valid`));
      } else {
        console.log(chalk.red(`✗ File key '${fileKey}' is invalid`));
        process.exit(1);
      }
    } catch (error) {
      console.log(chalk.red(`✗ File key '${fileKey}' is invalid: ${error.message}`));
      process.exit(1);
    }
  });

// List supported options
program
  .command('options')
  .description('List supported groupBy options and time periods')
  .action((options, command) => {
    const sdk = getSDK(command.optsWithGlobals());

    console.log(chalk.bold.blue('Supported GroupBy Options:'));
    console.log('Component Actions:', sdk.getSupportedGroupByOptions('component', 'actions').join(', '));
    console.log('Component Usages:', sdk.getSupportedGroupByOptions('component', 'usages').join(', '));
    console.log('Style Actions:', sdk.getSupportedGroupByOptions('style', 'actions').join(', '));
    console.log('Style Usages:', sdk.getSupportedGroupByOptions('style', 'usages').join(', '));
    console.log('Variable Actions:', sdk.getSupportedGroupByOptions('variable', 'actions').join(', '));
    console.log('Variable Usages:', sdk.getSupportedGroupByOptions('variable', 'usages').join(', '));

    console.log('\n' + chalk.bold.blue('Supported Time Periods:'));
    console.log(sdk.getAvailableTimePeriods().join(', '));
  });

// Parse arguments
program.parse();