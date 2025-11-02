#!/usr/bin/env node

/**
 * project: figma-comments
 * purpose: Command-line interface for Figma Comments operations
 * use-cases:
 *  - Interactive comment management from terminal
 *  - Automated comment processing scripts
 *  - Comment analytics and reporting
 *  - Comment reaction management and analytics
 * performance:
 *  - Streaming output for large datasets
 *  - Progress indicators for long operations
 *  - Efficient JSON/CSV/Markdown export
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { FigmaApiClient } from '@figma-api/fetch';
import { FigmaCommentsSDK } from './sdk.mjs';
import { promises as fs } from 'fs';

const program = new Command();

// Configure CLI
program
  .name('figma-comments')
  .description('CLI for Figma Comments API operations')
  .version('1.0.0')
  .option('-t, --token <token>', 'Figma API token (or set FIGMA_TOKEN env var)')
  .option('-v, --verbose', 'Verbose output')
  .option('--no-cache', 'Disable request caching')
  .option('--timeout <ms>', 'Request timeout in milliseconds', '30000');

// Helper to get SDK instance
function getSDK(options, command) {
  const globalOpts = command.optsWithGlobals();
  const token = globalOpts.token || process.env.FIGMA_TOKEN;

  if (!token) {
    console.error(chalk.red('Error: Figma API token is required'));
    console.error('Set via --token flag or FIGMA_TOKEN environment variable');
    console.error('Get your token at: https://www.figma.com/developers/api#authentication');
    process.exit(1);
  }

  const logger = globalOpts.verbose ? console : {
    debug: () => {},
    info: console.info,
    warn: console.warn,
    error: console.error
  };

  // Create FigmaApiClient instance with dependency injection
  const fetcher = new FigmaApiClient({
    apiToken: token,
    timeout: parseInt(globalOpts.timeout),
    enableCache: globalOpts.cache
  });

  return new FigmaCommentsSDK({ fetcher, logger });
}

// Helper to format output
function formatOutput(data, format = 'json', pretty = true) {
  switch (format) {
    case 'json':
      return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    case 'table':
      return formatAsTable(data);
    default:
      return String(data);
  }
}

function formatAsTable(data) {
  if (!Array.isArray(data)) return String(data);
  
  if (data.length === 0) return 'No data';
  
  const headers = Object.keys(data[0]);
  const maxWidths = headers.map(h => Math.max(h.length, ...data.map(item => String(item[h] || '').length)));
  
  const separator = '+' + maxWidths.map(w => '-'.repeat(w + 2)).join('+') + '+';
  const headerRow = '|' + headers.map((h, i) => ` ${h.padEnd(maxWidths[i])} `).join('|') + '|';
  
  const rows = data.map(item => 
    '|' + headers.map((h, i) => ` ${String(item[h] || '').padEnd(maxWidths[i])} `).join('|') + '|'
  );
  
  return [separator, headerRow, separator, ...rows, separator].join('\n');
}

// List command
program
  .command('list <file-key>')
  .description('List all comments in a file')
  .option('-f, --format <format>', 'Output format (json|table)', 'json')
  .option('-o, --output <file>', 'Output to file instead of stdout')
  .option('--threads', 'Group comments by thread')
  .option('--unresolved', 'Show only unresolved comments')
  .option('--user <user-id>', 'Show comments by specific user')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Fetching comments...').start();
    const sdk = getSDK(options, command);

    try {
      let comments;
      
      if (options.unresolved) {
        comments = await sdk.getUnresolvedComments(fileKey);
        spinner.text = 'Filtering unresolved comments...';
      } else if (options.user) {
        comments = await sdk.getCommentsByUser(fileKey, options.user);
        spinner.text = 'Filtering comments by user...';
      } else if (options.threads) {
        comments = await sdk.getCommentsGroupedByThread(fileKey);
        spinner.text = 'Grouping comments by thread...';
      } else {
        comments = await sdk.getComments(fileKey);
      }

      spinner.succeed(`Found ${Array.isArray(comments) ? comments.length : Object.keys(comments).length} comments`);
      
      const output = formatOutput(comments, options.format);
      
      if (options.output) {
        await fs.writeFile(options.output, output);
        console.log(chalk.green(`Output saved to ${options.output}`));
      } else {
        console.log(output);
      }
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Add command
program
  .command('add <file-key>')
  .description('Add a comment to a file')
  .requiredOption('-m, --message <text>', 'Comment message')
  .option('-x, --x <number>', 'X coordinate for comment position')
  .option('-y, --y <number>', 'Y coordinate for comment position')
  .option('-n, --node <node-id>', 'Node ID to attach comment to')
  .option('--offset-x <number>', 'X offset within node', '0')
  .option('--offset-y <number>', 'Y offset within node', '0')
  .option('-p, --parent <comment-id>', 'Parent comment ID for replies')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Adding comment...').start();
    const sdk = getSDK(options, command);

    try {
      let comment;
      
      if (options.parent) {
        comment = await sdk.replyToComment(fileKey, options.parent, options.message);
        spinner.text = 'Creating reply...';
      } else if (options.node) {
        comment = await sdk.addCommentToNode(
          fileKey, 
          options.node, 
          options.message,
          { x: parseFloat(options.offsetX), y: parseFloat(options.offsetY) }
        );
        spinner.text = 'Adding comment to node...';
      } else if (options.x !== undefined && options.y !== undefined) {
        comment = await sdk.addCommentAtCoordinates(
          fileKey, 
          parseFloat(options.x), 
          parseFloat(options.y), 
          options.message
        );
        spinner.text = 'Adding comment at coordinates...';
      } else {
        comment = await sdk.addComment(fileKey, options.message);
      }

      spinner.succeed(`Comment added with ID: ${comment.id}`);
      console.log(formatOutput(comment));
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
  .command('delete <file-key> <comment-id>')
  .description('Delete a comment')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (fileKey, commentId, options, command) => {
    if (!options.confirm) {
      console.log(chalk.yellow(`Are you sure you want to delete comment ${commentId}? Use --confirm to skip this prompt.`));
      process.exit(0);
    }

    const spinner = ora('Deleting comment...').start();
    const sdk = getSDK(options, command);

    try {
      const result = await sdk.deleteComment(fileKey, commentId);
      spinner.succeed('Comment deleted successfully');
      console.log(formatOutput(result));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Reply command
program
  .command('reply <file-key> <comment-id>')
  .description('Reply to a comment')
  .requiredOption('-m, --message <text>', 'Reply message')
  .action(async (fileKey, commentId, options, command) => {
    const spinner = ora('Adding reply...').start();
    const sdk = getSDK(options, command);

    try {
      const reply = await sdk.replyToComment(fileKey, commentId, options.message);
      spinner.succeed(`Reply added with ID: ${reply.id}`);
      console.log(formatOutput(reply));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// === REACTION COMMANDS ===

// Get reactions command
program
  .command('reactions <file-key> <comment-id>')
  .description('Get reactions for a comment')
  .option('-f, --format <format>', 'Output format (json|table)', 'json')
  .action(async (fileKey, commentId, options, command) => {
    const spinner = ora('Fetching comment reactions...').start();
    const sdk = getSDK(options, command);

    try {
      const reactions = await sdk.getCommentReactions(fileKey, commentId);
      
      const reactionCount = reactions.reactions ? reactions.reactions.length : 0;
      spinner.succeed(`Found ${reactionCount} reactions for comment ${commentId}`);
      
      console.log(formatOutput(reactions, options.format));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Add reaction command
program
  .command('react <file-key> <comment-id> <emoji>')
  .description('Add a reaction to a comment')
  .option('--toggle', 'Toggle reaction (remove if already present)')
  .action(async (fileKey, commentId, emoji, options, command) => {
    const spinner = ora(`Adding reaction "${emoji}"...`).start();
    const sdk = getSDK(options, command);

    try {
      let result;
      
      if (options.toggle) {
        result = await sdk.toggleReaction(fileKey, commentId, emoji);
        spinner.succeed(result.message);
      } else {
        result = await sdk.addReaction(fileKey, commentId, emoji);
        spinner.succeed(`Reaction "${emoji}" added to comment ${commentId}`);
      }
      
      console.log(formatOutput(result));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Remove reaction command
program
  .command('unreact <file-key> <comment-id> <emoji>')
  .description('Remove a reaction from a comment')
  .action(async (fileKey, commentId, emoji, options, command) => {
    const spinner = ora(`Removing reaction "${emoji}"...`).start();
    const sdk = getSDK(options, command);

    try {
      const result = await sdk.removeReaction(fileKey, commentId, emoji);
      spinner.succeed(`Reaction "${emoji}" removed from comment ${commentId}`);
      console.log(formatOutput(result));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Quick react command
program
  .command('quick-react <file-key> <comment-id> <type>')
  .description('Add a quick reaction (like, love, laugh, wow, sad, angry, etc.)')
  .option('--toggle', 'Toggle reaction (remove if already present)')
  .action(async (fileKey, commentId, type, options, command) => {
    const spinner = ora(`Adding ${type} reaction...`).start();
    const sdk = getSDK(options, command);

    try {
      let result;
      
      if (options.toggle) {
        // For toggle, we need to get the emoji first
        const emojiMap = {
          'like': '👍', 'dislike': '👎', 'love': '❤️', 'laugh': '😂',
          'wow': '😮', 'sad': '😢', 'angry': '😠', 'celebrate': '🎉',
          'fire': '🔥', 'rocket': '🚀'
        };
        const emoji = emojiMap[type.toLowerCase()];
        if (emoji) {
          result = await sdk.toggleReaction(fileKey, commentId, emoji);
          spinner.succeed(result.message);
        } else {
          throw new Error(`Unknown reaction type: ${type}`);
        }
      } else {
        result = await sdk.quickReact(fileKey, commentId, type);
        spinner.succeed(`${type} reaction added to comment ${commentId}`);
      }
      
      console.log(formatOutput(result));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Reaction summary command
program
  .command('reaction-summary <file-key>')
  .description('Get reaction summary for all comments in a file')
  .option('-f, --format <format>', 'Output format (json|table)', 'json')
  .option('-o, --output <file>', 'Output to file instead of stdout')
  .option('--top <number>', 'Number of top reactions/comments to show', '10')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Analyzing file reactions...').start();
    const sdk = getSDK(options, command);

    try {
      const summary = await sdk.getReactionSummary(fileKey, { 
        topCount: parseInt(options.top) 
      });
      
      spinner.succeed(`Analyzed ${summary.totalReactions} reactions across file`);
      
      const output = formatOutput(summary, options.format);
      
      if (options.output) {
        await fs.writeFile(options.output, output);
        console.log(chalk.green(`Output saved to ${options.output}`));
      } else {
        console.log(output);
      }
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Top reactions command
program
  .command('top-reactions <file-key>')
  .description('Get most popular reactions in a file')
  .option('-f, --format <format>', 'Output format (json|table)', 'json')
  .option('-l, --limit <number>', 'Number of top reactions to show', '10')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Fetching top reactions...').start();
    const sdk = getSDK(options, command);

    try {
      const topReactions = await sdk.getTopReactions(fileKey, parseInt(options.limit));
      
      spinner.succeed(`Found ${topReactions.length} different reaction types`);
      console.log(formatOutput(topReactions, options.format));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Most reacted comments command
program
  .command('most-reacted <file-key>')
  .description('Get comments with the most reactions')
  .option('-f, --format <format>', 'Output format (json|table)', 'json')
  .option('-l, --limit <number>', 'Number of top comments to show', '10')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Finding most reacted comments...').start();
    const sdk = getSDK(options, command);

    try {
      const mostReacted = await sdk.getMostReactedComments(fileKey, parseInt(options.limit));
      
      spinner.succeed(`Found ${mostReacted.length} comments with reactions`);
      console.log(formatOutput(mostReacted, options.format));
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
  .command('search <file-key> <query>')
  .description('Search for comments')
  .option('-f, --format <format>', 'Output format (json|table)', 'json')
  .option('-o, --output <file>', 'Output to file instead of stdout')
  .option('--include-users', 'Include user names in search')
  .action(async (fileKey, query, options, command) => {
    const spinner = ora('Searching comments...').start();
    const sdk = getSDK(options, command);

    try {
      const comments = await sdk.searchComments(fileKey, query, {
        includeUsers: options.includeUsers
      });
      
      spinner.succeed(`Found ${comments.length} matching comments`);
      
      const output = formatOutput(comments, options.format);
      
      if (options.output) {
        await fs.writeFile(options.output, output);
        console.log(chalk.green(`Output saved to ${options.output}`));
      } else {
        console.log(output);
      }
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Export command
program
  .command('export <file-key>')
  .description('Export comments to file')
  .option('-f, --format <format>', 'Export format (json|csv|markdown)', 'json')
  .requiredOption('-o, --output <file>', 'Output file path')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Exporting comments...').start();
    const sdk = getSDK(options, command);

    try {
      const exportData = await sdk.exportComments(fileKey, options.format);
      await fs.writeFile(options.output, exportData);
      
      spinner.succeed(`Comments exported to ${options.output}`);
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
  .description('Get comment statistics')
  .option('-f, --format <format>', 'Output format (json|table)', 'json')
  .option('--engagement', 'Include engagement metrics')
  .option('--activity <days>', 'Include activity for last N days', '30')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Calculating statistics...').start();
    const sdk = getSDK(options, command);

    try {
      let stats = await sdk.getCommentStatistics(fileKey);
      
      if (options.engagement) {
        spinner.text = 'Calculating engagement metrics...';
        const engagement = await sdk.getEngagementMetrics(fileKey);
        stats = { ...stats, engagement };
      }
      
      if (options.activity) {
        spinner.text = 'Analyzing activity...';
        const activity = await sdk.getCommentActivity(fileKey, parseInt(options.activity));
        stats = { ...stats, activity };
      }

      spinner.succeed('Statistics calculated');
      console.log(formatOutput(stats, options.format));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Bulk delete command
program
  .command('bulk-delete <file-key>')
  .description('Delete multiple comments')
  .requiredOption('-i, --ids <comment-ids>', 'Comma-separated list of comment IDs')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (fileKey, options, command) => {
    const commentIds = options.ids.split(',').map(id => id.trim());
    
    if (!options.confirm) {
      console.log(chalk.yellow(`Are you sure you want to delete ${commentIds.length} comments? Use --confirm to skip this prompt.`));
      process.exit(0);
    }

    const spinner = ora(`Deleting ${commentIds.length} comments...`).start();
    const sdk = getSDK(options, command);

    try {
      const results = await sdk.bulkDeleteComments(fileKey, commentIds);
      
      spinner.succeed(`Deleted ${results.successful.length}/${results.total} comments`);
      
      if (results.failed.length > 0) {
        console.log(chalk.yellow('\nFailed deletions:'));
        console.log(formatOutput(results.failed));
      }
      
      console.log(formatOutput(results));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Health command
program
  .command('health')
  .description('Check API health')
  .action(async (options, command) => {
    const spinner = ora('Checking API health...').start();
    const sdk = getSDK(options, command);

    try {
      const health = await sdk.healthCheck();
      const stats = sdk.getStats();
      
      if (health.status === 'healthy') {
        spinner.succeed('API is healthy');
        console.log(chalk.green('✓ API is responding normally'));
      } else {
        spinner.fail('API is unhealthy');
        console.log(chalk.red('✗ API health check failed'));
        console.log(chalk.red(`Error: ${health.error}`));
      }
      
      if (command.optsWithGlobals().verbose) {
        console.log('\nClient Statistics:');
        console.log(formatOutput(stats));
      }
    } catch (error) {
      spinner.fail(`Health check failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Recent command
program
  .command('recent <file-key>')
  .description('Get recent comments')
  .option('-d, --days <number>', 'Number of days to look back', '7')
  .option('-f, --format <format>', 'Output format (json|table)', 'json')
  .option('-o, --output <file>', 'Output to file instead of stdout')
  .action(async (fileKey, options, command) => {
    const spinner = ora('Fetching recent comments...').start();
    const sdk = getSDK(options, command);

    try {
      const comments = await sdk.getRecentComments(fileKey, parseInt(options.days));
      
      spinner.succeed(`Found ${comments.length} recent comments`);
      
      const output = formatOutput(comments, options.format);
      
      if (options.output) {
        await fs.writeFile(options.output, output);
        console.log(chalk.green(`Output saved to ${options.output}`));
      } else {
        console.log(output);
      }
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Thread command
program
  .command('thread <file-key> <comment-id>')
  .description('Get comment thread with all replies')
  .option('-f, --format <format>', 'Output format (json|table)', 'json')
  .action(async (fileKey, commentId, options, command) => {
    const spinner = ora('Fetching comment thread...').start();
    const sdk = getSDK(options, command);

    try {
      const thread = await sdk.getCommentThread(fileKey, commentId);
      
      spinner.succeed(`Found thread with ${thread.replies.length} replies`);
      console.log(formatOutput(thread, options.format));
    } catch (error) {
      spinner.fail(`Failed: ${error.message}`);
      if (command.optsWithGlobals().verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled error:'), error.message);
  if (program.opts().verbose) {
    console.error(error);
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log(chalk.yellow('\nOperation cancelled by user'));
  process.exit(0);
});

// Parse arguments
try {
  program.parse();
} catch (error) {
  console.error(chalk.red('CLI Error:'), error.message);
  process.exit(1);
}