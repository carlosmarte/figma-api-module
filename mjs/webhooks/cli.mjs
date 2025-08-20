#!/usr/bin/env node

/**
 * CLI interface for figma-webhooks
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { FigmaWebhooksSDK } from './sdk.mjs';

const program = new Command();

// Configure CLI
program
  .name('figma-webhooks')
  .description('CLI for Figma Webhooks API v2')
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
    process.exit(1);
  }

  return new FigmaWebhooksSDK({
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
      console.log(chalk.gray('No items found'));
    } else {
      data.forEach((item, index) => {
        console.log(`${index + 1}. ${formatWebhook(item)}`);
      });
    }
  } else {
    console.log(formatWebhook(data));
  }
}

// Helper to format webhook for display
function formatWebhook(webhook) {
  const status = webhook.status === 'ACTIVE' 
    ? chalk.green('ACTIVE')
    : chalk.yellow('PAUSED');
  
  const context = `${webhook.context}:${webhook.context_id}`;
  
  return [
    chalk.blue(webhook.id),
    chalk.white(webhook.event_type),
    status,
    chalk.gray(context),
    chalk.underline(webhook.endpoint)
  ].join(' | ');
}

// === Webhook Management Commands ===

// List webhooks
program
  .command('list')
  .description('List webhooks')
  .option('-c, --context <type>', 'Context type (team, project, file)')
  .option('-i, --context-id <id>', 'Context ID')
  .option('-p, --plan <id>', 'Plan API ID (lists all webhooks)')
  .action(async (options, command) => {
    const spinner = ora('Fetching webhooks...').start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      let webhooks;
      
      if (options.plan) {
        webhooks = await sdk.listAllWebhooks(options.plan);
        spinner.succeed(`Found ${webhooks.length} webhooks across all contexts`);
      } else {
        webhooks = await sdk.listWebhooks({
          context: options.context,
          contextId: options.contextId
        });
        spinner.succeed(`Found ${webhooks.length} webhooks`);
      }

      formatOutput(webhooks, globalOpts);
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (globalOpts.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Get specific webhook
program
  .command('get <webhook-id>')
  .description('Get webhook by ID')
  .action(async (webhookId, command) => {
    const spinner = ora(`Fetching webhook ${webhookId}...`).start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      const webhook = await sdk.getWebhook(webhookId);
      
      if (!webhook) {
        spinner.warn('Webhook not found');
        process.exit(1);
      }

      spinner.succeed('Webhook found');
      formatOutput(webhook, globalOpts);
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (globalOpts.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Create webhook
program
  .command('create')
  .description('Create a new webhook')
  .requiredOption('-e, --event <type>', 'Event type (FILE_UPDATE, FILE_DELETE, etc.)')
  .requiredOption('-c, --context <type>', 'Context type (team, project, file)')
  .requiredOption('-i, --context-id <id>', 'Context ID')
  .requiredOption('-u, --endpoint <url>', 'Webhook endpoint URL')
  .requiredOption('-p, --passcode <code>', 'Webhook passcode')
  .option('-d, --description <text>', 'Webhook description')
  .option('--paused', 'Create webhook in paused state')
  .action(async (options, command) => {
    const spinner = ora('Creating webhook...').start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      const webhook = await sdk.client.createWebhook({
        eventType: options.event,
        context: options.context,
        contextId: options.contextId,
        endpoint: options.endpoint,
        passcode: options.passcode,
        status: options.paused ? 'PAUSED' : 'ACTIVE',
        description: options.description
      });

      spinner.succeed(`Webhook created: ${webhook.id}`);
      formatOutput(webhook, globalOpts);
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (globalOpts.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Update webhook
program
  .command('update <webhook-id>')
  .description('Update an existing webhook')
  .option('-e, --event <type>', 'New event type')
  .option('-u, --endpoint <url>', 'New endpoint URL')
  .option('-p, --passcode <code>', 'New passcode')
  .option('-d, --description <text>', 'New description')
  .option('--status <status>', 'New status (ACTIVE, PAUSED)')
  .action(async (webhookId, options, command) => {
    const spinner = ora(`Updating webhook ${webhookId}...`).start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      const updates = {};
      if (options.event) updates.eventType = options.event;
      if (options.endpoint) updates.endpoint = options.endpoint;
      if (options.passcode) updates.passcode = options.passcode;
      if (options.description !== undefined) updates.description = options.description;
      if (options.status) updates.status = options.status;

      const webhook = await sdk.updateWebhook(webhookId, updates);
      
      spinner.succeed('Webhook updated');
      formatOutput(webhook, globalOpts);
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (globalOpts.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Delete webhook
program
  .command('delete <webhook-id>')
  .description('Delete a webhook')
  .option('-f, --force', 'Skip confirmation')
  .action(async (webhookId, options, command) => {
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    if (!options.force) {
      console.log(chalk.yellow(`Are you sure you want to delete webhook ${webhookId}?`));
      console.log(chalk.gray('Use --force to skip this confirmation'));
      process.exit(0);
    }

    const spinner = ora(`Deleting webhook ${webhookId}...`).start();

    try {
      const deleted = await sdk.deleteWebhook(webhookId);
      
      if (deleted) {
        spinner.succeed('Webhook deleted');
      } else {
        spinner.warn('Webhook was already deleted');
      }
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (globalOpts.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// === Webhook Control Commands ===

// Pause webhook
program
  .command('pause <webhook-id>')
  .description('Pause a webhook')
  .action(async (webhookId, command) => {
    const spinner = ora(`Pausing webhook ${webhookId}...`).start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      const webhook = await sdk.pauseWebhook(webhookId);
      spinner.succeed('Webhook paused');
      formatOutput(webhook, globalOpts);
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (globalOpts.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Activate webhook
program
  .command('activate <webhook-id>')
  .description('Activate a webhook')
  .action(async (webhookId, command) => {
    const spinner = ora(`Activating webhook ${webhookId}...`).start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      const webhook = await sdk.activateWebhook(webhookId);
      spinner.succeed('Webhook activated');
      formatOutput(webhook, globalOpts);
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (globalOpts.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// === Monitoring Commands ===

// Get webhook history
program
  .command('history <webhook-id>')
  .description('Get webhook delivery history')
  .action(async (webhookId, command) => {
    const spinner = ora(`Fetching history for webhook ${webhookId}...`).start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      const history = await sdk.getWebhookHistory(webhookId);
      spinner.succeed(`Found ${history.length} recent requests`);

      if (globalOpts.json) {
        formatOutput(history, globalOpts);
      } else {
        history.forEach((request, index) => {
          const status = request.response_info 
            ? (request.response_info.status < 400 ? chalk.green('✓') : chalk.red('✗'))
            : chalk.yellow('?');
          
          console.log(`${index + 1}. ${status} ${request.request_info.sent_at} → ${request.response_info?.status || 'no response'}`);
          
          if (request.error_msg) {
            console.log(`   ${chalk.red('Error:')} ${request.error_msg}`);
          }
        });
      }
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (globalOpts.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Check webhook health
program
  .command('health <webhook-id>')
  .description('Check webhook health status')
  .action(async (webhookId, command) => {
    const spinner = ora(`Checking health of webhook ${webhookId}...`).start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      const health = await sdk.checkWebhookHealth(webhookId);
      
      const statusColor = {
        healthy: chalk.green,
        degraded: chalk.yellow,
        failing: chalk.red,
        unknown: chalk.gray
      }[health.status];

      spinner.succeed(`Health check complete`);

      if (globalOpts.json) {
        formatOutput(health, globalOpts);
      } else {
        console.log(`Status: ${statusColor(health.status.toUpperCase())}`);
        console.log(`Message: ${health.message}`);
        
        if (health.successRate !== null) {
          console.log(`Success Rate: ${Math.round(health.successRate * 100)}%`);
          console.log(`Total Requests: ${health.totalRequests}`);
          console.log(`Successful: ${health.successfulRequests}`);
          console.log(`Failed: ${health.failedRequests}`);
        }
        
        if (health.lastDelivery) {
          console.log(`Last Delivery: ${health.lastDelivery}`);
        }
      }
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (globalOpts.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// === Utility Commands ===

// Test endpoint
program
  .command('test-endpoint <url>')
  .description('Test webhook endpoint connectivity')
  .action(async (url, command) => {
    const spinner = ora(`Testing endpoint ${url}...`).start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      const result = await sdk.testWebhookEndpoint(url);
      
      if (result.reachable) {
        spinner.succeed(`Endpoint is reachable (${result.status} ${result.statusText})`);
      } else {
        spinner.fail(`Endpoint is not reachable: ${result.error}`);
      }

      if (globalOpts.json) {
        formatOutput(result, globalOpts);
      }
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (globalOpts.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Search webhooks
program
  .command('search')
  .description('Search for webhooks')
  .requiredOption('-p, --plan <id>', 'Plan API ID')
  .option('-e, --endpoint <url>', 'Search by endpoint URL')
  .option('-t, --event-type <type>', 'Search by event type')
  .option('--inactive', 'Find only inactive webhooks')
  .action(async (options, command) => {
    const spinner = ora('Searching webhooks...').start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      let webhooks;

      if (options.endpoint) {
        webhooks = await sdk.findWebhooksByEndpoint(options.endpoint, options.plan);
        spinner.succeed(`Found ${webhooks.length} webhooks with endpoint: ${options.endpoint}`);
      } else if (options.eventType) {
        webhooks = await sdk.findWebhooksByEventType(options.eventType, options.plan);
        spinner.succeed(`Found ${webhooks.length} webhooks for event type: ${options.eventType}`);
      } else if (options.inactive) {
        webhooks = await sdk.findInactiveWebhooks(options.plan);
        spinner.succeed(`Found ${webhooks.length} inactive webhooks`);
      } else {
        webhooks = await sdk.listAllWebhooks(options.plan);
        spinner.succeed(`Found ${webhooks.length} total webhooks`);
      }

      formatOutput(webhooks, globalOpts);
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (globalOpts.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Show supported values
program
  .command('info')
  .description('Show supported event types and contexts')
  .action(async (command) => {
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    const info = {
      eventTypes: sdk.getSupportedEventTypes(),
      contextTypes: sdk.getSupportedContextTypes()
    };

    if (globalOpts.json) {
      formatOutput(info, globalOpts);
    } else {
      console.log(chalk.blue('Supported Event Types:'));
      info.eventTypes.forEach(type => console.log(`  • ${type}`));
      
      console.log(chalk.blue('\nSupported Context Types:'));
      info.contextTypes.forEach(type => console.log(`  • ${type}`));
    }
  });

// === Bulk Operations ===

// Bulk create
program
  .command('bulk-create')
  .description('Create multiple webhooks from JSON file')
  .requiredOption('-f, --file <path>', 'JSON file with webhook configurations')
  .action(async (options, command) => {
    const fs = await import('fs/promises');
    const spinner = ora('Reading webhook configurations...').start();
    const sdk = getSDK(command.optsWithGlobals());
    const globalOpts = command.optsWithGlobals();

    try {
      const data = JSON.parse(await fs.readFile(options.file, 'utf-8'));
      const contextIds = data.contextIds || [];
      const config = data.config || {};

      if (!contextIds.length || !config.context) {
        throw new Error('Invalid file format. Expected: { "contextIds": [...], "config": {...} }');
      }

      spinner.text = `Creating ${contextIds.length} webhooks...`;
      
      const results = await sdk.createBulkWebhooks(contextIds, config);
      
      spinner.succeed(`Created ${results.created.length} webhooks, ${results.errors.length} errors`);

      if (globalOpts.json) {
        formatOutput(results, globalOpts);
      } else {
        if (results.created.length > 0) {
          console.log(chalk.green('\nSuccessfully created:'));
          results.created.forEach(webhook => {
            console.log(`  ✓ ${webhook.id} (${webhook.context}:${webhook.context_id})`);
          });
        }

        if (results.errors.length > 0) {
          console.log(chalk.red('\nErrors:'));
          results.errors.forEach(error => {
            console.log(`  ✗ ${error.contextId}: ${error.error}`);
          });
        }
      }
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (globalOpts.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}