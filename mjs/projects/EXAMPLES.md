# Figma Projects API - Examples

This document provides practical examples for using the Figma Projects API client in real-world scenarios.

## Table of Contents

- [Setup and Authentication](#setup-and-authentication)
- [Basic Operations](#basic-operations)
- [Advanced Use Cases](#advanced-use-cases)
- [CLI Examples](#cli-examples)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)
- [Integration Examples](#integration-examples)

## Setup and Authentication

### Basic Setup

```javascript
import FigmaProjectsSDK from 'figma-projects';

// Using environment variable (recommended)
const figma = new FigmaProjectsSDK(process.env.FIGMA_TOKEN);

// Or with explicit token
const figma = new FigmaProjectsSDK({
  apiToken: 'figd_your_token_here'
});
```

### Advanced Configuration

```javascript
import FigmaProjectsSDK from 'figma-projects';

const figma = new FigmaProjectsSDK({
  apiToken: process.env.FIGMA_TOKEN,
  baseUrl: 'https://api.figma.com',
  timeout: 60000, // 60 seconds
  maxRetries: 5,
  enableCache: true,
  enableMetrics: true,
  rateLimitRpm: 30, // Conservative rate limiting
  logger: {
    debug: (msg, meta) => console.debug(`[DEBUG] ${msg}`, meta),
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta),
    error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta)
  }
});
```

## Basic Operations

### 1. List All Projects in a Team

```javascript
async function listTeamProjects() {
  try {
    const result = await figma.getTeamProjects('your-team-id');
    
    console.log(`Team: ${result.team.name}`);
    console.log(`Total projects: ${result.totalCount}`);
    
    result.projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.name} (ID: ${project.id})`);
    });
  } catch (error) {
    console.error('Failed to fetch projects:', error.message);
  }
}
```

### 2. Get Files in a Project

```javascript
async function listProjectFiles() {
  try {
    const result = await figma.getProjectFiles('your-project-id', {
      branchData: true,
      sortByModified: true
    });
    
    console.log(`Project: ${result.project.name}`);
    console.log(`Total files: ${result.totalCount}`);
    
    result.files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name}`);
      console.log(`   Last modified: ${file.lastModified}`);
      console.log(`   Days old: ${file.enriched.daysSinceModified}`);
      console.log(`   Recent: ${file.enriched.isRecent ? 'Yes' : 'No'}`);
    });
  } catch (error) {
    console.error('Failed to fetch files:', error.message);
  }
}
```

### 3. Get Complete Project Tree

```javascript
async function getCompleteProjectTree() {
  try {
    const result = await figma.getProjectTree('your-team-id', {
      includeEmptyProjects: false,
      maxConcurrency: 3
    });
    
    console.log(`Team: ${result.team.name}`);
    console.log(`Projects: ${result.totalProjects}`);
    console.log(`Total files: ${result.totalFiles}`);
    
    result.projects.forEach(project => {
      console.log(`\n📁 ${project.name} (${project.fileCount} files)`);
      
      project.files.slice(0, 5).forEach(file => {
        console.log(`  📄 ${file.name}`);
      });
      
      if (project.fileCount > 5) {
        console.log(`  ... and ${project.fileCount - 5} more files`);
      }
    });
  } catch (error) {
    console.error('Failed to build project tree:', error.message);
  }
}
```

## Advanced Use Cases

### 1. Team Dashboard with Statistics

```javascript
async function generateTeamDashboard(teamId) {
  try {
    const overview = await figma.getTeamOverview(teamId, {
      includeStats: true,
      includeRecentFiles: true,
      recentFilesLimit: 10
    });
    
    // Team summary
    console.log(`📊 Team Dashboard: ${overview.team.name}`);
    console.log(`═══════════════════════════════════════`);
    console.log(`Total Projects: ${overview.summary.totalProjects}`);
    console.log(`Total Files: ${overview.summary.totalFiles}`);
    console.log(`Active Projects: ${overview.summary.activeProjects} (${overview.summary.activeProjectsPercentage.toFixed(1)}%)`);
    
    // Recent activity
    console.log(`\n🔥 Recent Activity:`);
    overview.recentFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name} (${file.projectName})`);
      console.log(`   Modified: ${new Date(file.lastModified).toLocaleDateString()}`);
    });
    
    // Project breakdown
    console.log(`\n📁 Project Breakdown:`);
    overview.projects.forEach(project => {
      if (project.statistics) {
        const stats = project.statistics;
        console.log(`${project.name}:`);
        console.log(`  Files: ${stats.fileCount}`);
        console.log(`  Last activity: ${stats.activitySummary.lastWeek} files this week`);
      }
    });
    
    return overview;
  } catch (error) {
    console.error('Failed to generate dashboard:', error.message);
    throw error;
  }
}

// Usage
generateTeamDashboard('your-team-id');
```

### 2. Search and Analysis

```javascript
async function analyzeProjectsByType(teamId) {
  try {
    const projects = await figma.getTeamProjects(teamId);
    
    // Categorize projects by name patterns
    const categories = {
      'Design Systems': [],
      'Mobile Apps': [],
      'Websites': [],
      'Prototypes': [],
      'Other': []
    };
    
    projects.projects.forEach(project => {
      const name = project.name.toLowerCase();
      
      if (name.includes('design system') || name.includes('component')) {
        categories['Design Systems'].push(project);
      } else if (name.includes('mobile') || name.includes('app')) {
        categories['Mobile Apps'].push(project);
      } else if (name.includes('website') || name.includes('web')) {
        categories['Websites'].push(project);
      } else if (name.includes('prototype') || name.includes('wireframe')) {
        categories['Prototypes'].push(project);
      } else {
        categories['Other'].push(project);
      }
    });
    
    // Display analysis
    console.log(`📊 Project Analysis for ${projects.team.name}`);
    console.log(`═══════════════════════════════════`);
    
    Object.entries(categories).forEach(([category, projects]) => {
      if (projects.length > 0) {
        console.log(`\n${category}: ${projects.length} projects`);
        projects.forEach(project => {
          console.log(`  • ${project.name}`);
        });
      }
    });
    
    return categories;
  } catch (error) {
    console.error('Analysis failed:', error.message);
    throw error;
  }
}
```

### 3. File Audit and Cleanup Suggestions

```javascript
async function auditTeamFiles(teamId) {
  try {
    const projectTree = await figma.getProjectTree(teamId);
    const audit = {
      totalFiles: 0,
      oldFiles: [],
      duplicateNames: {},
      largeProjects: [],
      emptyProjects: []
    };
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    projectTree.projects.forEach(project => {
      audit.totalFiles += project.fileCount;
      
      // Check for empty projects
      if (project.fileCount === 0) {
        audit.emptyProjects.push(project);
      }
      
      // Check for large projects
      if (project.fileCount > 50) {
        audit.largeProjects.push({
          ...project,
          fileCount: project.fileCount
        });
      }
      
      // Analyze files
      project.files.forEach(file => {
        // Check for old files
        const fileDate = new Date(file.lastModified);
        if (fileDate < thirtyDaysAgo) {
          audit.oldFiles.push({
            ...file,
            projectName: project.name,
            daysSinceModified: Math.floor((Date.now() - fileDate) / (1000 * 60 * 60 * 24))
          });
        }
        
        // Check for duplicate names
        const fileName = file.name.toLowerCase();
        if (!audit.duplicateNames[fileName]) {
          audit.duplicateNames[fileName] = [];
        }
        audit.duplicateNames[fileName].push({
          ...file,
          projectName: project.name
        });
      });
    });
    
    // Filter to only duplicates
    audit.duplicateNames = Object.fromEntries(
      Object.entries(audit.duplicateNames).filter(([_, files]) => files.length > 1)
    );
    
    // Generate report
    console.log(`🔍 File Audit Report for ${projectTree.team.name}`);
    console.log(`═══════════════════════════════════════`);
    console.log(`Total files analyzed: ${audit.totalFiles}`);
    
    console.log(`\n📅 Old Files (not modified in 30+ days): ${audit.oldFiles.length}`);
    audit.oldFiles.slice(0, 10).forEach(file => {
      console.log(`  • ${file.name} (${file.projectName}) - ${file.daysSinceModified} days old`);
    });
    if (audit.oldFiles.length > 10) {
      console.log(`  ... and ${audit.oldFiles.length - 10} more`);
    }
    
    console.log(`\n📁 Large Projects (50+ files): ${audit.largeProjects.length}`);
    audit.largeProjects.forEach(project => {
      console.log(`  • ${project.name}: ${project.fileCount} files`);
    });
    
    console.log(`\n📄 Duplicate File Names: ${Object.keys(audit.duplicateNames).length}`);
    Object.entries(audit.duplicateNames).slice(0, 5).forEach(([name, files]) => {
      console.log(`  • "${name}" appears in ${files.length} projects:`);
      files.forEach(file => {
        console.log(`    - ${file.projectName}`);
      });
    });
    
    console.log(`\n🗂️ Empty Projects: ${audit.emptyProjects.length}`);
    audit.emptyProjects.forEach(project => {
      console.log(`  • ${project.name}`);
    });
    
    return audit;
  } catch (error) {
    console.error('Audit failed:', error.message);
    throw error;
  }
}
```

### 4. Automated Backup and Export

```javascript
async function createTeamBackup(teamId, outputPath = './figma-backup') {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Create backup directory
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    
    // Get complete project data
    const projectTree = await figma.getProjectTree(teamId);
    
    // Export as JSON
    const jsonExport = await figma.exportProjects(teamId, 'json');
    fs.writeFileSync(path.join(outputPath, 'projects.json'), jsonExport);
    
    // Export as CSV
    const csvExport = await figma.exportProjects(teamId, 'csv');
    fs.writeFileSync(path.join(outputPath, 'projects.csv'), csvExport);
    
    // Generate summary report
    const summary = {
      exportDate: new Date().toISOString(),
      team: projectTree.team,
      summary: {
        totalProjects: projectTree.totalProjects,
        totalFiles: projectTree.totalFiles,
        projectDetails: projectTree.projects.map(project => ({
          id: project.id,
          name: project.name,
          fileCount: project.fileCount,
          files: project.files.map(file => ({
            key: file.key,
            name: file.name,
            lastModified: file.lastModified,
            thumbnailUrl: file.thumbnailUrl
          }))
        }))
      }
    };
    
    fs.writeFileSync(
      path.join(outputPath, 'backup-summary.json'), 
      JSON.stringify(summary, null, 2)
    );
    
    console.log(`✅ Backup completed successfully!`);
    console.log(`📁 Files saved to: ${outputPath}`);
    console.log(`📊 Backed up ${projectTree.totalProjects} projects with ${projectTree.totalFiles} files`);
    
    return { outputPath, summary };
  } catch (error) {
    console.error('Backup failed:', error.message);
    throw error;
  }
}
```

### 5. Performance Monitoring

```javascript
async function monitorApiPerformance(teamId) {
  const startTime = Date.now();
  
  try {
    // Clear metrics to start fresh
    figma.resetMetrics();
    
    // Perform various operations
    console.log('🚀 Starting performance test...');
    
    const operations = [
      () => figma.getTeamProjects(teamId),
      () => figma.getProjectTree(teamId),
      () => figma.searchProjects(teamId, 'design'),
      () => figma.getRecentFiles(teamId, 10, 7)
    ];
    
    const results = [];
    
    for (const operation of operations) {
      const opStart = Date.now();
      try {
        await operation();
        results.push({
          operation: operation.name,
          duration: Date.now() - opStart,
          success: true
        });
      } catch (error) {
        results.push({
          operation: operation.name,
          duration: Date.now() - opStart,
          success: false,
          error: error.message
        });
      }
    }
    
    // Get final metrics
    const metrics = figma.getMetrics();
    const rateLimitStatus = figma.client.getRateLimitStatus();
    const cacheStats = figma.client.getCacheStats();
    
    // Display performance report
    console.log(`\n📊 Performance Report`);
    console.log(`═══════════════════════`);
    console.log(`Total duration: ${Date.now() - startTime}ms`);
    console.log(`\nAPI Metrics:`);
    console.log(`  Total requests: ${metrics.client.totalRequests}`);
    console.log(`  Success rate: ${(metrics.client.successRate * 100).toFixed(1)}%`);
    console.log(`  Average response time: ${metrics.client.averageResponseTime.toFixed(0)}ms`);
    console.log(`  Cache hit rate: ${(metrics.client.cacheHitRate * 100).toFixed(1)}%`);
    
    console.log(`\nRate Limiting:`);
    console.log(`  Requests remaining: ${rateLimitStatus.requestsRemaining}/${rateLimitStatus.totalRequests}`);
    
    console.log(`\nCache Performance:`);
    console.log(`  Cache size: ${cacheStats.size}/${cacheStats.maxSize}`);
    
    console.log(`\nOperation Results:`);
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${index + 1}. ${result.operation}: ${status} (${result.duration}ms)`);
      if (!result.success) {
        console.log(`     Error: ${result.error}`);
      }
    });
    
    return { metrics, results, duration: Date.now() - startTime };
  } catch (error) {
    console.error('Performance monitoring failed:', error.message);
    throw error;
  }
}
```

## CLI Examples

### 1. Basic Commands

```bash
# Set up your API token
export FIGMA_TOKEN="your-figma-token"

# Get team overview with nice table formatting
figma-projects overview --team-id "123456789" --format table

# List projects with statistics
figma-projects list-projects --team-id "123456789" --include-stats --format table

# Search for design system projects
figma-projects search --team-id "123456789" --query "design system" --format table

# Get recent activity
figma-projects recent --team-id "123456789" --limit 20 --days 14 --format table
```

### 2. Export and Reporting

```bash
# Export all projects to CSV
figma-projects export --team-id "123456789" --format csv --output team-projects.csv

# Export with specific formatting
figma-projects export --team-id "123456789" --format json | jq '.projects[] | {name, id, fileCount}'

# Get project statistics
figma-projects stats --project-id "987654321" --format table
```

### 3. File Management

```bash
# Find specific files across projects
figma-projects get-tree --team-id "123456789" --format json | \
  jq '.projects[].files[] | select(.name | contains("component"))'

# List files in a project with branch data
figma-projects list-files --project-id "987654321" --branch-data --format table

# Find a specific file
figma-projects find-file --project-id "987654321" --file-name "Design System.fig" --format table
```

### 4. Monitoring and Health

```bash
# Check API health
figma-projects health --format table

# Monitor performance metrics
figma-projects metrics --format table

# Verbose operations for debugging
figma-projects list-projects --team-id "123456789" --verbose --format table
```

### 5. Automation Scripts

```bash
#!/bin/bash
# daily-figma-report.sh

TEAM_ID="your-team-id"
DATE=$(date +%Y-%m-%d)
REPORT_DIR="./figma-reports/$DATE"

# Create report directory
mkdir -p "$REPORT_DIR"

echo "Generating daily Figma report for $DATE..."

# Generate team overview
figma-projects overview --team-id "$TEAM_ID" --format json > "$REPORT_DIR/overview.json"

# Export project structure
figma-projects export --team-id "$TEAM_ID" --format csv --output "$REPORT_DIR/projects.csv"

# Get recent activity
figma-projects recent --team-id "$TEAM_ID" --limit 50 --days 1 --format json > "$REPORT_DIR/recent-activity.json"

# Get API metrics
figma-projects metrics --format json > "$REPORT_DIR/api-metrics.json"

echo "Report generated in $REPORT_DIR"
```

## Error Handling

### 1. Comprehensive Error Handling

```javascript
import { 
  AuthenticationError, 
  RateLimitError, 
  NotFoundError,
  NetworkError,
  ValidationError,
  TimeoutError
} from 'figma-projects';

async function robustApiCall(teamId) {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      return await figma.getTeamProjects(teamId);
    } catch (error) {
      attempt++;
      
      if (error instanceof AuthenticationError) {
        console.error('❌ Authentication failed - check your API token');
        throw error; // Don't retry auth errors
      }
      
      if (error instanceof RateLimitError) {
        const delay = error.retryAfter * 1000;
        console.warn(`⏳ Rate limited, waiting ${error.retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue; // Retry after delay
      }
      
      if (error instanceof NetworkError && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.warn(`🌐 Network error, retrying in ${delay/1000}s... (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (error instanceof NotFoundError) {
        console.error(`❌ Resource not found: ${error.identifier}`);
        throw error; // Don't retry not found errors
      }
      
      if (error instanceof ValidationError) {
        console.error(`❌ Validation error: ${error.message}`);
        console.error(`Field: ${error.field}, Value: ${error.value}`);
        throw error; // Don't retry validation errors
      }
      
      if (error instanceof TimeoutError) {
        console.error(`⏰ Request timed out after ${error.timeout}ms`);
        if (attempt < maxRetries) {
          console.warn('Retrying with longer timeout...');
          continue;
        }
      }
      
      // Final attempt failed
      console.error(`❌ All attempts failed: ${error.message}`);
      throw error;
    }
  }
}
```

### 2. Graceful Degradation

```javascript
async function getTeamDataWithFallback(teamId) {
  const result = {
    team: null,
    projects: [],
    files: [],
    errors: []
  };
  
  try {
    // Try to get basic team data
    const teamData = await figma.getTeamProjects(teamId);
    result.team = teamData.team;
    result.projects = teamData.projects;
  } catch (error) {
    result.errors.push({
      operation: 'getTeamProjects',
      error: error.message,
      code: error.code
    });
  }
  
  // Try to get files for each project, but don't fail if some fail
  for (const project of result.projects) {
    try {
      const fileData = await figma.getProjectFiles(project.id);
      result.files.push(...fileData.files.map(file => ({
        ...file,
        projectId: project.id,
        projectName: project.name
      })));
    } catch (error) {
      result.errors.push({
        operation: 'getProjectFiles',
        projectId: project.id,
        error: error.message,
        code: error.code
      });
    }
  }
  
  console.log(`✅ Retrieved ${result.projects.length} projects and ${result.files.length} files`);
  if (result.errors.length > 0) {
    console.warn(`⚠️ ${result.errors.length} operations failed`);
  }
  
  return result;
}
```

## Performance Optimization

### 1. Batch Operations with Concurrency Control

```javascript
async function efficientBatchProcessing(teamId) {
  const BATCH_SIZE = 5;
  const DELAY_BETWEEN_BATCHES = 1000; // 1 second
  
  try {
    const projects = await figma.getTeamProjects(teamId);
    const results = [];
    
    // Process projects in batches
    for (let i = 0; i < projects.projects.length; i += BATCH_SIZE) {
      const batch = projects.projects.slice(i, i + BATCH_SIZE);
      
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(projects.projects.length/BATCH_SIZE)}`);
      
      // Process batch concurrently
      const batchPromises = batch.map(async (project) => {
        try {
          const files = await figma.getProjectFiles(project.id);
          return {
            success: true,
            project: project,
            fileCount: files.totalCount,
            files: files.files
          };
        } catch (error) {
          return {
            success: false,
            project: project,
            error: error.message
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Delay between batches to be respectful to the API
      if (i + BATCH_SIZE < projects.projects.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Processed ${successful.length} projects successfully`);
    if (failed.length > 0) {
      console.warn(`⚠️ ${failed.length} projects failed`);
    }
    
    return { successful, failed };
  } catch (error) {
    console.error('Batch processing failed:', error.message);
    throw error;
  }
}
```

### 2. Smart Caching Strategy

```javascript
class SmartFigmaCache {
  constructor(figmaSDK) {
    this.figma = figmaSDK;
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
  }
  
  async getTeamProjectsCached(teamId, ttl = this.defaultTTL) {
    const key = `team:${teamId}`;
    
    if (this.isValid(key)) {
      console.log('📦 Using cached team data');
      return this.cache.get(key);
    }
    
    console.log('🌐 Fetching fresh team data');
    const data = await this.figma.getTeamProjects(teamId);
    this.set(key, data, ttl);
    
    return data;
  }
  
  async getProjectFilesCached(projectId, ttl = this.defaultTTL) {
    const key = `project:${projectId}`;
    
    if (this.isValid(key)) {
      console.log('📦 Using cached project files');
      return this.cache.get(key);
    }
    
    console.log('🌐 Fetching fresh project files');
    const data = await this.figma.getProjectFiles(projectId);
    this.set(key, data, ttl);
    
    return data;
  }
  
  isValid(key) {
    if (!this.cache.has(key)) return false;
    
    const expiry = this.cacheExpiry.get(key);
    if (Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return false;
    }
    
    return true;
  }
  
  set(key, data, ttl) {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + ttl);
  }
  
  clear() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
  
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Usage
const cache = new SmartFigmaCache(figma);

// Use cached methods
const projects = await cache.getTeamProjectsCached('team-id');
const files = await cache.getProjectFilesCached('project-id');
```

## Integration Examples

### 1. Slack Bot Integration

```javascript
import { WebClient } from '@slack/web-api';

class FigmaSlackBot {
  constructor(figmaToken, slackToken) {
    this.figma = new FigmaProjectsSDK(figmaToken);
    this.slack = new WebClient(slackToken);
  }
  
  async sendDailyReport(channelId, teamId) {
    try {
      const recent = await this.figma.getRecentFiles(teamId, 10, 1);
      
      if (recent.totalFound === 0) {
        await this.slack.chat.postMessage({
          channel: channelId,
          text: '📊 No Figma activity in the last 24 hours'
        });
        return;
      }
      
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📊 Daily Figma Report - ${recent.team.name}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${recent.totalFound} files* updated in the last 24 hours`
          }
        }
      ];
      
      // Add file details
      recent.files.slice(0, 5).forEach(file => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `• *${file.name}* in _${file.projectName}_\n  Last modified: ${new Date(file.lastModified).toLocaleString()}`
          }
        });
      });
      
      if (recent.totalFound > 5) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `_...and ${recent.totalFound - 5} more files_`
          }
        });
      }
      
      await this.slack.chat.postMessage({
        channel: channelId,
        blocks: blocks
      });
      
    } catch (error) {
      await this.slack.chat.postMessage({
        channel: channelId,
        text: `❌ Failed to generate Figma report: ${error.message}`
      });
    }
  }
  
  async handleSlashCommand(command, teamId) {
    const { text, channel_id } = command;
    
    try {
      if (text.startsWith('search ')) {
        const query = text.substring(7);
        const results = await this.figma.searchProjects(teamId, query);
        
        if (results.totalMatches === 0) {
          return {
            text: `No projects found matching "${query}"`
          };
        }
        
        const projectList = results.results.slice(0, 5).map(p => 
          `• ${p.name} (ID: ${p.id})`
        ).join('\n');
        
        return {
          text: `Found ${results.totalMatches} projects matching "${query}":\n${projectList}`
        };
      }
      
      if (text === 'recent') {
        const recent = await this.figma.getRecentFiles(teamId, 5, 7);
        
        if (recent.totalFound === 0) {
          return { text: 'No recent activity in the last 7 days' };
        }
        
        const fileList = recent.files.map(f => 
          `• ${f.name} (${f.projectName}) - ${new Date(f.lastModified).toLocaleDateString()}`
        ).join('\n');
        
        return {
          text: `Recent files (last 7 days):\n${fileList}`
        };
      }
      
      return {
        text: 'Available commands: `search <query>`, `recent`'
      };
      
    } catch (error) {
      return {
        text: `Error: ${error.message}`
      };
    }
  }
}
```

### 2. GitHub Actions Integration

```yaml
# .github/workflows/figma-audit.yml
name: Figma Project Audit

on:
  schedule:
    - cron: '0 9 * * 1' # Every Monday at 9 AM
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm install figma-projects
        
      - name: Run Figma audit
        env:
          FIGMA_TOKEN: ${{ secrets.FIGMA_TOKEN }}
          TEAM_ID: ${{ secrets.FIGMA_TEAM_ID }}
        run: |
          npx figma-projects overview --team-id "$TEAM_ID" --format json > figma-overview.json
          npx figma-projects export --team-id "$TEAM_ID" --format csv --output figma-projects.csv
          
      - name: Upload audit results
        uses: actions/upload-artifact@v3
        with:
          name: figma-audit-results
          path: |
            figma-overview.json
            figma-projects.csv
            
      - name: Create issue for old files
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const overview = JSON.parse(fs.readFileSync('figma-overview.json'));
            
            // Custom logic to analyze overview and create issues
            const oldFiles = overview.projects
              .flatMap(p => p.files || [])
              .filter(f => {
                const daysSinceModified = Math.floor(
                  (Date.now() - new Date(f.lastModified)) / (1000 * 60 * 60 * 24)
                );
                return daysSinceModified > 90;
              });
            
            if (oldFiles.length > 10) {
              await github.rest.issues.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: `Figma Audit: ${oldFiles.length} files not modified in 90+ days`,
                body: `Found ${oldFiles.length} potentially stale Figma files. Consider reviewing for cleanup.`
              });
            }
```

### 3. Custom Dashboard with Express

```javascript
import express from 'express';
import FigmaProjectsSDK from 'figma-projects';

const app = express();
const figma = new FigmaProjectsSDK(process.env.FIGMA_TOKEN);

// Dashboard API endpoints
app.get('/api/teams/:teamId/dashboard', async (req, res) => {
  try {
    const { teamId } = req.params;
    const overview = await figma.getTeamOverview(teamId);
    res.json(overview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/teams/:teamId/activity', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { days = 7, limit = 20 } = req.query;
    
    const recent = await figma.getRecentFiles(teamId, parseInt(limit), parseInt(days));
    res.json(recent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { q: query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const results = await figma.searchProjects(teamId, query);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Figma dashboard running on http://localhost:3000');
});
```

These examples demonstrate the flexibility and power of the Figma Projects API client. You can adapt them to your specific needs and integrate them into your existing workflows and tools.