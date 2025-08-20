# Figma Comments API Examples

This document provides practical examples for using the Figma Comments API client in various scenarios, including the new reaction management features.

## Table of Contents

- [Basic Operations](#basic-operations)
- [Comment Positioning](#comment-positioning)
- [Comment Reactions](#comment-reactions)
- [Search and Filtering](#search-and-filtering)
- [Bulk Operations](#bulk-operations)
- [Analytics and Statistics](#analytics-and-statistics)
- [Export and Import](#export-and-import)
- [Error Handling](#error-handling)
- [CLI Examples](#cli-examples)
- [Integration Examples](#integration-examples)

## Basic Operations

### Getting Started

```javascript
import FigmaCommentsSDK from 'figma-comments';

// Initialize the SDK
const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN,
  logger: console  // Optional: use custom logger
});

const fileKey = 'your-figma-file-key';  // Extract from Figma URL
```

### List All Comments

```javascript
async function listComments() {
  try {
    const comments = await sdk.getComments(fileKey);
    
    console.log(`Found ${comments.length} comments`);
    comments.forEach(comment => {
      console.log(`${comment.user.handle}: ${comment.message}`);
      console.log(`Created: ${new Date(comment.created_at).toLocaleString()}`);
      if (comment.resolved_at) {
        console.log(`Resolved: ${new Date(comment.resolved_at).toLocaleString()}`);
      }
      console.log('---');
    });
  } catch (error) {
    console.error('Failed to fetch comments:', error.message);
  }
}
```

### Add Simple Comment

```javascript
async function addSimpleComment() {
  try {
    const comment = await sdk.addComment(fileKey, 'This looks great! 👍');
    
    console.log('Comment added successfully:');
    console.log(`ID: ${comment.id}`);
    console.log(`Message: ${comment.message}`);
    console.log(`Created: ${new Date(comment.created_at).toLocaleString()}`);
  } catch (error) {
    console.error('Failed to add comment:', error.message);
  }
}
```

### Reply to Comment

```javascript
async function replyToComment(parentCommentId) {
  try {
    const reply = await sdk.replyToComment(
      fileKey, 
      parentCommentId, 
      'Thanks for the feedback! I\'ll make those changes.'
    );
    
    console.log('Reply added successfully:');
    console.log(`Reply ID: ${reply.id}`);
    console.log(`Parent ID: ${reply.parent_id}`);
  } catch (error) {
    console.error('Failed to add reply:', error.message);
  }
}
```

### Delete Comment

```javascript
async function deleteComment(commentId) {
  try {
    const result = await sdk.deleteComment(fileKey, commentId);
    console.log('Comment deleted successfully');
  } catch (error) {
    console.error('Failed to delete comment:', error.message);
  }
}
```

## Comment Positioning

### Add Comment at Coordinates

```javascript
async function addCommentAtPosition() {
  try {
    // Add comment at specific canvas coordinates
    const comment = await sdk.addCommentAtCoordinates(
      fileKey,
      250,     // x coordinate
      150,     // y coordinate
      'Please adjust the spacing here'
    );
    
    console.log('Positioned comment added:', comment.id);
  } catch (error) {
    console.error('Failed to add positioned comment:', error.message);
  }
}
```

### Add Comment to Node

```javascript
async function addCommentToNode() {
  try {
    // Add comment attached to a specific node (frame, component, etc.)
    const comment = await sdk.addCommentToNode(
      fileKey,
      'node-id-from-figma',     // Node ID
      'This component needs refinement',
      { x: 10, y: 20 }          // Offset within the node
    );
    
    console.log('Node comment added:', comment.id);
  } catch (error) {
    console.error('Failed to add node comment:', error.message);
  }
}
```

## Comment Reactions

### Get Comment Reactions

```javascript
async function getCommentReactions(commentId) {
  try {
    const reactions = await sdk.getCommentReactions(fileKey, commentId);
    
    console.log(`Comment has ${reactions.reactions?.length || 0} reactions:`);
    reactions.reactions?.forEach(reaction => {
      console.log(`${reaction.emoji} by ${reaction.user.handle}`);
    });
  } catch (error) {
    console.error('Failed to get reactions:', error.message);
  }
}
```

### Add Reactions

```javascript
async function addReactionToComment(commentId) {
  try {
    // Add a custom emoji reaction
    const reaction = await sdk.addReaction(fileKey, commentId, '👍');
    console.log('Reaction added:', reaction);
    
    // Or use quick reactions for common emojis
    await sdk.quickReact(fileKey, commentId, 'love');   // ❤️
    await sdk.quickReact(fileKey, commentId, 'laugh');  // 😂
    await sdk.quickReact(fileKey, commentId, 'fire');   // 🔥
    
    console.log('Quick reactions added');
  } catch (error) {
    console.error('Failed to add reaction:', error.message);
  }
}
```

### Toggle Reactions

```javascript
async function toggleCommentReaction(commentId, emoji) {
  try {
    const result = await sdk.toggleReaction(fileKey, commentId, emoji);
    
    console.log(`${result.action} reaction "${result.emoji}"`);
    console.log(`Result: ${result.message}`);
  } catch (error) {
    console.error('Failed to toggle reaction:', error.message);
  }
}
```

### Remove Reactions

```javascript
async function removeReaction(commentId, emoji) {
  try {
    const result = await sdk.removeReaction(fileKey, commentId, emoji);
    console.log(`Removed reaction "${emoji}"`);
  } catch (error) {
    console.error('Failed to remove reaction:', error.message);
  }
}
```

### Get Reaction Analytics

```javascript
async function analyzeReactions() {
  try {
    // Get comprehensive reaction summary
    const summary = await sdk.getReactionSummary(fileKey);
    
    console.log(`Total reactions: ${summary.totalReactions}`);
    console.log('Top reactions:');
    summary.topEmojis.forEach(({ emoji, count }) => {
      console.log(`  ${emoji}: ${count} times`);
    });
    
    console.log('Most reacted comments:');
    summary.mostReactedComments.forEach(({ commentId, count, comment }) => {
      console.log(`  "${comment?.message.substring(0, 50)}..." (${count} reactions)`);
    });
    
    // Get just top reactions
    const topReactions = await sdk.getTopReactions(fileKey, 5);
    console.log('Top 5 reactions:', topReactions);
    
    // Get most reacted comments
    const mostReacted = await sdk.getMostReactedComments(fileKey, 3);
    console.log('Top 3 most reacted comments:', mostReacted);
  } catch (error) {
    console.error('Failed to analyze reactions:', error.message);
  }
}
```

### Reaction Engagement Workflow

```javascript
async function reactionEngagementWorkflow(commentId) {
  try {
    // 1. Get current reactions
    const reactions = await sdk.getCommentReactions(fileKey, commentId);
    console.log('Current reactions:', reactions.reactions?.length || 0);
    
    // 2. Add approval reaction
    await sdk.quickReact(fileKey, commentId, 'like');
    
    // 3. Toggle celebration (add if not present, remove if present)
    const toggleResult = await sdk.toggleReaction(fileKey, commentId, '🎉');
    console.log('Toggle result:', toggleResult.action);
    
    // 4. Get updated reactions
    const updatedReactions = await sdk.getCommentReactions(fileKey, commentId);
    console.log('Updated reactions:', updatedReactions.reactions?.length || 0);
    
    // 5. Check file-wide reaction trends
    const summary = await sdk.getReactionSummary(fileKey);
    console.log('File reaction trends:', summary.topEmojis.slice(0, 3));
    
  } catch (error) {
    if (error.message.includes('file_comments:write')) {
      console.error('Missing write permissions for reactions. Required scope: file_comments:write');
    } else if (error.message.includes('file_comments:read')) {
      console.error('Missing read permissions for reactions. Required scopes: file_comments:read, files:read');
    } else {
      console.error('Reaction workflow failed:', error.message);
    }
  }
}
```

## Search and Filtering

### Search Comments

```javascript
async function searchComments() {
  try {
    // Search for comments containing specific text
    const results = await sdk.searchComments(fileKey, 'design system');
    
    console.log(`Found ${results.length} comments mentioning "design system"`);
    results.forEach(comment => {
      console.log(`${comment.user.handle}: ${comment.message}`);
    });
  } catch (error) {
    console.error('Search failed:', error.message);
  }
}
```

### Filter by User

```javascript
async function getCommentsByUser() {
  try {
    const userId = 'user-id-from-figma';
    const userComments = await sdk.getCommentsByUser(fileKey, userId);
    
    console.log(`User has ${userComments.length} comments`);
    userComments.forEach(comment => {
      console.log(`${comment.message} (${new Date(comment.created_at).toLocaleDateString()})`);
    });
  } catch (error) {
    console.error('Failed to get user comments:', error.message);
  }
}
```

### Get Unresolved Comments

```javascript
async function getUnresolvedComments() {
  try {
    const unresolved = await sdk.getUnresolvedComments(fileKey);
    
    console.log(`${unresolved.length} unresolved comments:`);
    unresolved.forEach(comment => {
      console.log(`- ${comment.message}`);
      console.log(`  By: ${comment.user.handle}`);
      console.log(`  Created: ${new Date(comment.created_at).toLocaleDateString()}`);
    });
  } catch (error) {
    console.error('Failed to get unresolved comments:', error.message);
  }
}
```

### Get Recent Comments

```javascript
async function getRecentComments() {
  try {
    const days = 7;
    const recent = await sdk.getRecentComments(fileKey, days);
    
    console.log(`Comments from the last ${days} days:`);
    recent.forEach(comment => {
      const daysAgo = Math.ceil((Date.now() - new Date(comment.created_at)) / (1000 * 60 * 60 * 24));
      console.log(`${daysAgo}d ago: ${comment.message}`);
    });
  } catch (error) {
    console.error('Failed to get recent comments:', error.message);
  }
}
```

## Bulk Operations

### Bulk Add Comments

```javascript
async function bulkAddComments() {
  try {
    const commentsToAdd = [
      { 
        message: 'First batch comment',
        position: { x: 100, y: 100 }
      },
      { 
        message: 'Second batch comment',
        position: { x: 200, y: 200 }
      },
      { 
        message: 'Third batch comment' 
      }
    ];
    
    const results = await sdk.bulkAddComments(fileKey, commentsToAdd);
    
    console.log(`Added ${results.successful.length}/${results.total} comments`);
    
    if (results.failed.length > 0) {
      console.log('Failed comments:');
      results.failed.forEach(failure => {
        console.log(`- Index ${failure.index}: ${failure.error}`);
      });
    }
  } catch (error) {
    console.error('Bulk add failed:', error.message);
  }
}
```

### Bulk Delete Comments

```javascript
async function bulkDeleteComments() {
  try {
    // Get all resolved comments
    const allComments = await sdk.getComments(fileKey);
    const resolvedCommentIds = allComments
      .filter(c => c.resolved_at)
      .map(c => c.id);
    
    if (resolvedCommentIds.length === 0) {
      console.log('No resolved comments to delete');
      return;
    }
    
    const results = await sdk.bulkDeleteComments(fileKey, resolvedCommentIds);
    
    console.log(`Deleted ${results.successful.length}/${results.total} resolved comments`);
    
    if (results.failed.length > 0) {
      console.log('Failed deletions:');
      results.failed.forEach(failure => {
        console.log(`- ${failure.commentId}: ${failure.error}`);
      });
    }
  } catch (error) {
    console.error('Bulk delete failed:', error.message);
  }
}
```

## Analytics and Statistics

### Basic Statistics

```javascript
async function getBasicStats() {
  try {
    const stats = await sdk.getCommentStatistics(fileKey);
    
    console.log('Comment Statistics:');
    console.log(`Total comments: ${stats.total}`);
    console.log(`Resolved: ${stats.resolved}`);
    console.log(`Unresolved: ${stats.unresolved}`);
    console.log(`Root comments: ${stats.rootComments}`);
    console.log(`Total replies: ${stats.totalReplies}`);
    console.log(`Threads with replies: ${stats.withReplies}`);
    console.log(`Unique users: ${stats.uniqueUsers}`);
    console.log(`Average message length: ${stats.averageLength} characters`);
    
    if (stats.oldestComment) {
      console.log(`Oldest comment: ${new Date(stats.oldestComment.created_at).toLocaleDateString()}`);
    }
    
    if (stats.newestComment) {
      console.log(`Newest comment: ${new Date(stats.newestComment.created_at).toLocaleDateString()}`);
    }
  } catch (error) {
    console.error('Failed to get statistics:', error.message);
  }
}
```

### Enhanced Engagement Metrics with Reactions

```javascript
async function getEngagementMetrics() {
  try {
    const metrics = await sdk.getEngagementMetrics(fileKey);
    
    console.log('Engagement Metrics:');
    console.log(`Response rate: ${metrics.responseRate.toFixed(1)}%`);
    console.log(`Average replies per thread: ${metrics.avgRepliesPerThread.toFixed(1)}`);
    
    // Reaction metrics
    console.log(`\nReaction Metrics:`);
    console.log(`Total reactions: ${metrics.totalReactions}`);
    console.log(`Reaction rate: ${metrics.reactionRate.toFixed(1)}%`);
    console.log(`Average reactions per comment: ${metrics.avgReactionsPerComment.toFixed(1)}`);
    console.log(`Users engaging with reactions: ${metrics.reactionEngagementUsers}`);
    
    if (metrics.mostActiveUser) {
      console.log(`Most active user: ${metrics.mostActiveUser.user.handle} (${metrics.mostActiveUser.count} comments)`);
    }
    
    if (metrics.longestThread) {
      console.log(`Longest thread: ${metrics.longestThread.replyCount} replies`);
    }
    
    console.log('\nTop reactions:');
    metrics.topReactions.forEach(({ emoji, count }) => {
      console.log(`  ${emoji}: ${count}`);
    });
    
    console.log('\nMost reacted comments:');
    metrics.mostReactedComments.slice(0, 3).forEach(({ count, comment }) => {
      if (comment) {
        console.log(`  "${comment.message.substring(0, 50)}..." (${count} reactions)`);
      }
    });
  } catch (error) {
    console.error('Failed to get engagement metrics:', error.message);
  }
}
```

### Activity Analysis

```javascript
async function analyzeActivity() {
  try {
    const days = 30;
    const activity = await sdk.getCommentActivity(fileKey, days);
    
    console.log(`Activity over the last ${days} days:`);
    
    Object.entries(activity)
      .sort(([a], [b]) => new Date(b) - new Date(a))
      .forEach(([date, data]) => {
        console.log(`${date}: ${data.comments} comments by ${data.uniqueUsers} users`);
      });
    
    // Calculate totals
    const totalComments = Object.values(activity).reduce((sum, data) => sum + data.comments, 0);
    const activeDays = Object.keys(activity).length;
    
    console.log(`\nSummary:`);
    console.log(`Total comments: ${totalComments}`);
    console.log(`Active days: ${activeDays}/${days}`);
    console.log(`Average comments per active day: ${(totalComments / activeDays).toFixed(1)}`);
  } catch (error) {
    console.error('Failed to analyze activity:', error.message);
  }
}
```

### Comment Threads Analysis

```javascript
async function analyzeThreads() {
  try {
    const threads = await sdk.getCommentsGroupedByThread(fileKey);
    
    console.log(`Found ${threads.length} comment threads:`);
    
    // Sort by reply count
    threads
      .sort((a, b) => b.replies.length - a.replies.length)
      .slice(0, 10)  // Top 10 most active threads
      .forEach((thread, index) => {
        console.log(`${index + 1}. "${thread.message.substring(0, 50)}..." (${thread.replies.length} replies)`);
        console.log(`   By: ${thread.user.handle}`);
        console.log(`   Created: ${new Date(thread.created_at).toLocaleDateString()}`);
      });
  } catch (error) {
    console.error('Failed to analyze threads:', error.message);
  }
}
```

## Export and Import

### Export to JSON

```javascript
async function exportToJson() {
  try {
    const jsonData = await sdk.exportComments(fileKey, 'json');
    
    // Save to file
    await require('fs').promises.writeFile('comments.json', jsonData);
    console.log('Comments exported to comments.json');
    
    // Or parse and use the data
    const comments = JSON.parse(jsonData);
    console.log(`Exported ${comments.length} comments`);
  } catch (error) {
    console.error('Export failed:', error.message);
  }
}
```

### Export to CSV

```javascript
async function exportToCsv() {
  try {
    const csvData = await sdk.exportComments(fileKey, 'csv');
    
    await require('fs').promises.writeFile('comments.csv', csvData);
    console.log('Comments exported to comments.csv');
    
    // Can be opened in Excel, Google Sheets, etc.
  } catch (error) {
    console.error('CSV export failed:', error.message);
  }
}
```

### Export to Markdown Report

```javascript
async function exportToMarkdown() {
  try {
    const markdownData = await sdk.exportComments(fileKey, 'markdown');
    
    await require('fs').promises.writeFile('comments-report.md', markdownData);
    console.log('Comments exported to comments-report.md');
    
    // Great for documentation, GitHub, Notion, etc.
  } catch (error) {
    console.error('Markdown export failed:', error.message);
  }
}
```

### Daily Comment Report with Reactions

```javascript
async function generateDailyReport() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const recent = await sdk.getRecentComments(fileKey, 1);
    const stats = await sdk.getCommentStatistics(fileKey);
    const reactionSummary = await sdk.getReactionSummary(fileKey);
    
    const report = `
# Daily Comment Report - ${today}

## Summary
- Total comments in file: ${stats.total}
- New comments today: ${recent.length}
- Unresolved comments: ${stats.unresolved}
- Total reactions: ${reactionSummary.totalReactions}

## Today's Comments
${recent.map(comment => `
### ${comment.user.handle}
**Time:** ${new Date(comment.created_at).toLocaleTimeString()}
**Message:** ${comment.message}
`).join('\n')}

## Reaction Trends
${reactionSummary.topEmojis.slice(0, 5).map(({ emoji, count }) => 
  `- ${emoji}: ${count} times`
).join('\n')}

## Action Items
- [ ] Review ${stats.unresolved} unresolved comments
- [ ] Follow up on feedback from design team
- [ ] Check ${reactionSummary.mostReactedComments.length} highly reacted comments
`;

    await require('fs').promises.writeFile(`daily-report-${today}.md`, report);
    console.log(`Daily report generated: daily-report-${today}.md`);
  } catch (error) {
    console.error('Report generation failed:', error.message);
  }
}
```

## Error Handling

### Comprehensive Error Handling

```javascript
import { 
  RateLimitError, 
  AuthenticationError, 
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ApiError 
} from 'figma-comments';

async function robustCommentOperation() {
  try {
    const comments = await sdk.getComments(fileKey);
    return comments;
  } catch (error) {
    if (error instanceof RateLimitError) {
      console.log(`Rate limited. Retrying after ${error.retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, error.retryAfter * 1000));
      return robustCommentOperation(); // Retry
    } else if (error instanceof AuthenticationError) {
      console.error('Authentication failed. Check your API token.');
      throw error;
    } else if (error instanceof AuthorizationError) {
      console.error(`Authorization failed: ${error.message}`);
      if (error.meta?.requiredScopes) {
        console.error(`Required scopes: ${error.meta.requiredScopes.join(', ')}`);
      }
      throw error;
    } else if (error instanceof ValidationError) {
      console.error(`Validation error: ${error.message}`);
      if (error.field) {
        console.error(`Field: ${error.field}, Value: ${error.value}`);
      }
      throw error;
    } else if (error instanceof NotFoundError) {
      console.error(`Resource not found: ${error.resource}`);
      throw error;
    } else if (error instanceof ApiError) {
      console.error(`API error (${error.status}): ${error.message}`);
      throw error;
    } else {
      console.error('Unexpected error:', error.message);
      throw error;
    }
  }
}
```

### Retry with Exponential Backoff

```javascript
async function retryWithBackoff(operation, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof RateLimitError || error.status >= 500) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.log(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error; // Don't retry client errors
      }
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const comments = await retryWithBackoff(() => sdk.getComments(fileKey));
```

## CLI Examples

### Basic CLI Usage

```bash
# Set up environment
export FIGMA_TOKEN="your-figma-token"

# List all comments
figma-comments list abcd1234567890

# List in table format
figma-comments list abcd1234567890 -f table

# Save to file
figma-comments list abcd1234567890 -o comments.json
```

### Reaction CLI Commands

```bash
# Get reactions for a comment
figma-comments reactions abcd1234567890 comment-id-123

# Add reaction
figma-comments react abcd1234567890 comment-id-123 "👍"

# Toggle reaction (add if not present, remove if present)
figma-comments react abcd1234567890 comment-id-123 "❤️" --toggle

# Remove reaction
figma-comments unreact abcd1234567890 comment-id-123 "👍"

# Quick reactions
figma-comments quick-react abcd1234567890 comment-id-123 like
figma-comments quick-react abcd1234567890 comment-id-123 love --toggle

# Get reaction summary
figma-comments reaction-summary abcd1234567890 --top 10

# Get top reactions
figma-comments top-reactions abcd1234567890 -l 5

# Get most reacted comments
figma-comments most-reacted abcd1234567890 -l 3
```

### Advanced CLI Operations

```bash
# Add positioned comment
figma-comments add abcd1234567890 \
  -m "Please adjust the margin here" \
  -x 250 -y 150

# Add comment to specific node
figma-comments add abcd1234567890 \
  -m "This component needs refinement" \
  -n "node-123:456"

# Search with verbose output
figma-comments search abcd1234567890 "design system" -v

# Export with specific format
figma-comments export abcd1234567890 -f csv -o design-feedback.csv

# Get detailed statistics with engagement metrics
figma-comments stats abcd1234567890 --engagement --activity 30

# Bulk operations
figma-comments bulk-delete abcd1234567890 \
  -i "comment1,comment2,comment3" \
  --confirm
```

### CLI Scripting with Reactions

```bash
#!/bin/bash
# daily-comment-check.sh

FILE_KEY="your-file-key"
DATE=$(date +%Y-%m-%d)

echo "Daily Comment Check - $DATE"
echo "================================"

# Get unresolved comments count
UNRESOLVED=$(figma-comments list $FILE_KEY --unresolved -f json | jq length)
echo "Unresolved comments: $UNRESOLVED"

# Get today's comments
figma-comments recent $FILE_KEY -d 1 -f table

# Get reaction summary
echo -e "\nReaction Summary:"
figma-comments reaction-summary $FILE_KEY --top 5 -f json | jq '.topEmojis[]'

# Get most reacted comments
echo -e "\nMost Reacted Comments:"
figma-comments most-reacted $FILE_KEY -l 3 -f table

# Export for backup
figma-comments export $FILE_KEY -f json -o "backup/comments-$DATE.json"

echo "Check complete!"
```

## Integration Examples

### Slack Bot Integration with Reactions

```javascript
import { WebClient } from '@slack/web-api';
import FigmaCommentsSDK from 'figma-comments';

class FigmaSlackBot {
  constructor(slackToken, figmaToken) {
    this.slack = new WebClient(slackToken);
    this.figma = new FigmaCommentsSDK({ apiToken: figmaToken });
  }

  async notifyNewComments(fileKey, channelId) {
    try {
      const recent = await this.figma.getRecentComments(fileKey, 1);
      
      for (const comment of recent) {
        // Get reactions for the comment
        const reactions = await this.figma.getCommentReactions(fileKey, comment.id);
        const reactionText = reactions.reactions?.length > 0 
          ? `\n*Reactions:* ${reactions.reactions.map(r => r.emoji).join(' ')}`
          : '';
        
        await this.slack.chat.postMessage({
          channel: channelId,
          text: `New Figma comment from ${comment.user.handle}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*New comment from ${comment.user.handle}*\n${comment.message}${reactionText}`
              }
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '👍' },
                  action_id: `react_${comment.id}_thumbs_up`
                },
                {
                  type: 'button', 
                  text: { type: 'plain_text', text: '❤️' },
                  action_id: `react_${comment.id}_heart`
                },
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'View in Figma' },
                  url: `https://figma.com/file/${fileKey}`,
                  action_id: 'view_figma'
                }
              ]
            }
          ]
        });
      }
    } catch (error) {
      console.error('Slack notification failed:', error.message);
    }
  }

  async handleReactionButton(payload) {
    try {
      const actionId = payload.actions[0].action_id;
      const [action, commentId, reactionType] = actionId.split('_');
      
      if (action === 'react') {
        const emojiMap = { 'thumbs': '👍', 'heart': '❤️' };
        const emoji = emojiMap[reactionType];
        
        if (emoji) {
          await this.figma.toggleReaction(fileKey, commentId, emoji);
          
          // Update Slack message to show the reaction was added
          await this.slack.chat.update({
            channel: payload.channel.id,
            ts: payload.message.ts,
            text: `Reaction ${emoji} toggled!`
          });
        }
      }
    } catch (error) {
      console.error('Reaction handling failed:', error.message);
    }
  }

  async digestReactionTrends(fileKey, channelId) {
    try {
      const summary = await this.figma.getReactionSummary(fileKey);
      
      if (summary.totalReactions === 0) {
        await this.slack.chat.postMessage({
          channel: channelId,
          text: '📊 No reactions yet in this file.'
        });
        return;
      }

      const trendText = summary.topEmojis
        .slice(0, 5)
        .map(({ emoji, count }) => `${emoji} ${count}`)
        .join(' • ');

      await this.slack.chat.postMessage({
        channel: channelId,
        text: `📊 Reaction trends: ${trendText}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Figma Reaction Trends*\n\n*Total reactions:* ${summary.totalReactions}\n*Top reactions:* ${trendText}\n\n*Most reacted comments:*\n${summary.mostReactedComments.slice(0, 3).map(({ count, comment }) => 
                comment ? `• "${comment.message.substring(0, 80)}..." (${count} reactions)` : ''
              ).join('\n')}`
            }
          }
        ]
      });
    } catch (error) {
      console.error('Reaction digest failed:', error.message);
    }
  }
}

// Usage
const bot = new FigmaSlackBot(slackToken, figmaToken);
setInterval(() => bot.notifyNewComments(fileKey, '#design'), 300000); // Every 5 minutes
setInterval(() => bot.digestReactionTrends(fileKey, '#design'), 86400000); // Daily
```

### Design System Documentation with Reactions

```javascript
import FigmaCommentsSDK from 'figma-comments';

class DesignSystemDocs {
  constructor(figmaToken) {
    this.figma = new FigmaCommentsSDK({ apiToken: figmaToken });
  }

  async generateComponentDocumentation(fileKey) {
    try {
      const comments = await this.figma.getComments(fileKey);
      const threads = await this.figma.getCommentsGroupedByThread(fileKey);
      const reactionSummary = await this.figma.getReactionSummary(fileKey);
      
      // Group comments by component (assuming node-attached comments)
      const componentComments = {};
      
      comments.forEach(comment => {
        if (comment.client_meta?.node_id) {
          const nodeId = comment.client_meta.node_id;
          if (!componentComments[nodeId]) {
            componentComments[nodeId] = [];
          }
          componentComments[nodeId].push(comment);
        }
      });

      // Generate documentation
      let documentation = '# Design System Documentation\n\n';
      
      Object.entries(componentComments).forEach(([nodeId, comments]) => {
        documentation += `## Component: ${nodeId}\n\n`;
        documentation += '### Feedback and Comments\n\n';
        
        for (const comment of comments) {
          // Get reactions for this comment
          const commentReactions = reactionSummary.userReactionActivity;
          const reactionCount = Object.values(commentReactions)
            .reduce((sum, user) => sum + user.reactionCount, 0);
          
          documentation += `- **${comment.user.handle}** (${new Date(comment.created_at).toLocaleDateString()})`;
          if (reactionCount > 0) {
            documentation += ` *[${reactionCount} reactions]*`;
          }
          documentation += `: ${comment.message}\n`;
        }
        
        documentation += '\n';
      });

      // Add summary statistics with reactions
      const stats = await this.figma.getCommentStatistics(fileKey);
      documentation += `## Summary\n\n`;
      documentation += `- Total feedback items: ${stats.total}\n`;
      documentation += `- Resolved: ${stats.resolved}\n`;
      documentation += `- Pending: ${stats.unresolved}\n`;
      documentation += `- Contributors: ${stats.uniqueUsers}\n`;
      documentation += `- Total reactions: ${reactionSummary.totalReactions}\n`;
      documentation += `- Most popular reaction: ${reactionSummary.topEmojis[0]?.emoji || 'None'} (${reactionSummary.topEmojis[0]?.count || 0} times)\n`;

      return documentation;
    } catch (error) {
      console.error('Documentation generation failed:', error.message);
      throw error;
    }
  }
}
```

These examples demonstrate the full capabilities of the enhanced Figma Comments API client, including the new reaction management features. Each example is production-ready and can be adapted to your specific use case. The reaction features enable richer engagement tracking and provide valuable insights into design feedback patterns.