# Figma Library Analytics - Examples

This document provides practical examples for using the Figma Library Analytics library.

## Basic Setup

```javascript
import { FigmaLibraryAnalyticsSDK } from 'figma-library-analytics';

const analytics = new FigmaLibraryAnalyticsSDK({
  apiToken: process.env.FIGMA_TOKEN // Must have library_analytics:read scope
});

const libraryFileKey = 'your-library-file-key';
```

## Component Analytics Examples

### 1. Component Performance Dashboard

```javascript
async function createComponentDashboard(fileKey) {
  console.log('📊 Component Performance Dashboard\n');

  // Get overall component adoption metrics
  const adoption = await analytics.getComponentAdoption(fileKey, {
    period: 'lastMonth'
  });

  console.log(`📈 Component Overview (Last Month)`);
  console.log(`   Total Components: ${adoption.totalComponents}`);
  console.log(`   Active Components: ${adoption.activeComponents}`);
  console.log(`   Adoption Rate: ${Math.round((adoption.activeComponents / adoption.totalComponents) * 100)}%`);
  console.log(`   Total Usage: ${adoption.totalUsages} instances\n`);

  // Get top performing components
  const leaderboard = await analytics.getComponentLeaderboard(fileKey, {
    limit: 5
  });

  console.log('🏆 Top 5 Components by Usage:');
  leaderboard.forEach(component => {
    console.log(`   ${component.rank}. ${component.component_name}: ${component.usage_count} uses`);
  });

  // Get team engagement
  const teamEngagement = await analytics.getComponentTeamEngagement(fileKey);
  
  console.log(`\n👥 Team Engagement:`);
  console.log(`   Active Teams: ${teamEngagement.activeTeams}/${teamEngagement.totalTeams}`);
  console.log(`   Engagement Rate: ${Math.round(teamEngagement.engagementRate * 100)}%`);
}

// Usage
await createComponentDashboard(libraryFileKey);
```

### 2. Component Usage Analysis

```javascript
async function analyzeComponentUsage(fileKey) {
  console.log('🔍 Component Usage Analysis\n');

  // Get detailed component usage data
  const allUsages = await analytics.getAllData(
    analytics.getComponentUsages,
    fileKey,
    { groupBy: 'component' }
  );

  // Analyze usage patterns
  const usageAnalysis = {
    heavyUse: allUsages.filter(c => c.usage_count > 50),
    moderateUse: allUsages.filter(c => c.usage_count >= 10 && c.usage_count <= 50),
    lightUse: allUsages.filter(c => c.usage_count < 10),
    unused: allUsages.filter(c => c.usage_count === 0)
  };

  console.log('📊 Usage Distribution:');
  console.log(`   Heavy Use (>50): ${usageAnalysis.heavyUse.length} components`);
  console.log(`   Moderate Use (10-50): ${usageAnalysis.moderateUse.length} components`);
  console.log(`   Light Use (<10): ${usageAnalysis.lightUse.length} components`);
  console.log(`   Unused: ${usageAnalysis.unused.length} components\n`);

  // Show unused components for cleanup consideration
  if (usageAnalysis.unused.length > 0) {
    console.log('⚠️  Unused Components (Consider for cleanup):');
    usageAnalysis.unused.forEach(component => {
      console.log(`   - ${component.component_name}`);
    });
  }

  return usageAnalysis;
}

// Usage
const usageAnalysis = await analyzeComponentUsage(libraryFileKey);
```

### 3. Component Action Tracking

```javascript
async function trackComponentActions(fileKey) {
  console.log('📈 Component Action Tracking\n');

  // Get component actions by component (last month)
  const componentActions = await analytics.getAllData(
    analytics.getComponentActions,
    fileKey,
    {
      groupBy: 'component',
      startDate: '2023-11-01',
      endDate: '2023-11-30'
    }
  );

  // Get component actions by team
  const teamActions = await analytics.getAllData(
    analytics.getComponentActions,
    fileKey,
    {
      groupBy: 'team',
      startDate: '2023-11-01',
      endDate: '2023-11-30'
    }
  );

  console.log('🔧 Most Modified Components:');
  componentActions
    .sort((a, b) => b.action_count - a.action_count)
    .slice(0, 5)
    .forEach((component, index) => {
      console.log(`   ${index + 1}. ${component.component_name}: ${component.action_count} actions`);
    });

  console.log('\n👥 Most Active Teams:');
  teamActions
    .sort((a, b) => b.action_count - a.action_count)
    .slice(0, 3)
    .forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.team_name}: ${team.action_count} actions`);
    });
}

// Usage
await trackComponentActions(libraryFileKey);
```

## Style Analytics Examples

### 4. Style Adoption Report

```javascript
async function generateStyleReport(fileKey) {
  console.log('🎨 Style Adoption Report\n');

  const styleAdoption = await analytics.getStyleAdoption(fileKey, {
    period: 'lastQuarter'
  });

  console.log('📊 Style Overview (Last Quarter):');
  console.log(`   Total Styles: ${styleAdoption.totalStyles}`);
  console.log(`   Active Styles: ${styleAdoption.activeStyles}`);
  console.log(`   Total Actions: ${styleAdoption.totalActions}`);
  console.log(`   Total Usage: ${styleAdoption.totalUsages}\n`);

  // Get style leaderboard
  const topStyles = await analytics.getStyleLeaderboard(fileKey, {
    limit: 10
  });

  console.log('🏆 Top 10 Styles by Usage:');
  topStyles.forEach(style => {
    const usage = style.usage_count || 0;
    const bar = '█'.repeat(Math.floor(usage / 10));
    console.log(`   ${style.rank}. ${style.style_name}: ${usage} ${bar}`);
  });

  return { styleAdoption, topStyles };
}

// Usage
const styleReport = await generateStyleReport(libraryFileKey);
```

## Variable Analytics Examples

### 5. Variable Usage Insights

```javascript
async function analyzeVariableUsage(fileKey) {
  console.log('🔧 Variable Usage Insights\n');

  const variableAdoption = await analytics.getVariableAdoption(fileKey);

  console.log('📊 Variable Overview:');
  console.log(`   Total Variables: ${variableAdoption.totalVariables}`);
  console.log(`   Active Variables: ${variableAdoption.activeVariables}`);
  console.log(`   Adoption Rate: ${Math.round((variableAdoption.activeVariables / variableAdoption.totalVariables) * 100)}%\n`);

  // Get variable usage by file to see where they're used
  const fileUsages = await analytics.getAllData(
    analytics.getVariableUsages,
    fileKey,
    { groupBy: 'file' }
  );

  console.log('📁 Files Using Variables:');
  fileUsages
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, 10)
    .forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.file_name}: ${file.usage_count} variable instances`);
    });

  // Get variable-specific usage
  const variableUsages = await analytics.getAllData(
    analytics.getVariableUsages,
    fileKey,
    { groupBy: 'variable' }
  );

  const unusedVariables = variableUsages.filter(v => v.usage_count === 0);
  
  if (unusedVariables.length > 0) {
    console.log('\n⚠️  Unused Variables:');
    unusedVariables.forEach(variable => {
      console.log(`   - ${variable.variable_name}`);
    });
  }

  return { variableAdoption, fileUsages, unusedVariables };
}

// Usage
const variableInsights = await analyzeVariableUsage(libraryFileKey);
```

## Comprehensive Analytics Examples

### 6. Library Health Assessment

```javascript
async function assessLibraryHealth(fileKey) {
  console.log('🏥 Library Health Assessment\n');

  const healthReport = await analytics.getLibraryHealthReport(fileKey, {
    period: 'lastMonth'
  });

  const { summary } = healthReport;

  console.log('📊 Health Summary:');
  console.log(`   Health Score: ${summary.healthScore}/100`);
  console.log(`   Total Assets: ${summary.totalAssets}`);
  console.log(`   Active Assets: ${summary.activeAssets}`);
  console.log(`   Adoption Rate: ${Math.round(summary.adoptionRate * 100)}%`);
  console.log(`   Total Usages: ${summary.totalUsages}\n`);

  // Show health score with visual indicator
  const healthEmoji = summary.healthScore >= 80 ? '🟢' : 
                     summary.healthScore >= 60 ? '🟡' : '🔴';
  console.log(`${healthEmoji} Overall Health: ${getHealthDescription(summary.healthScore)}\n`);

  // Display recommendations
  if (healthReport.recommendations.length > 0) {
    console.log('💡 Recommendations:');
    healthReport.recommendations.forEach((rec, index) => {
      const priority = rec.priority === 'high' ? '🔴' : 
                      rec.priority === 'medium' ? '🟡' : '🟢';
      console.log(`   ${priority} ${rec.message}`);
    });
  }

  return healthReport;
}

function getHealthDescription(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Fair';
  if (score >= 60) return 'Needs Improvement';
  return 'Poor';
}

// Usage
const healthAssessment = await assessLibraryHealth(libraryFileKey);
```

### 7. Trend Analysis and Growth Tracking

```javascript
async function analyzeTrends(fileKey) {
  console.log('📈 Library Growth Trends\n');

  const trends = await analytics.getLibraryTrends(fileKey, {
    periods: ['lastWeek', 'lastMonth', 'lastQuarter']
  });

  console.log('📊 Growth Comparison (Week vs Month):');
  
  const comparison = trends.comparison;
  
  // Components
  console.log(`   Components:`);
  console.log(`     Total Change: ${comparison.components.totalChange}%`);
  console.log(`     Usage Change: ${comparison.components.usagesChange}%`);
  console.log(`     Activity Change: ${comparison.components.actionsChange}%`);

  // Styles
  console.log(`   Styles:`);
  console.log(`     Total Change: ${comparison.styles.totalChange}%`);
  console.log(`     Usage Change: ${comparison.styles.usagesChange}%`);

  // Variables
  console.log(`   Variables:`);
  console.log(`     Total Change: ${comparison.variables.totalChange}%`);
  console.log(`     Usage Change: ${comparison.variables.usagesChange}%`);

  // Trend indicators
  console.log('\n📈 Trend Indicators:');
  const componentTrend = comparison.components.usagesChange > 0 ? '📈 Growing' : '📉 Declining';
  const styleTrend = comparison.styles.usagesChange > 0 ? '📈 Growing' : '📉 Declining';
  const variableTrend = comparison.variables.usagesChange > 0 ? '📈 Growing' : '📉 Declining';
  
  console.log(`   Component Usage: ${componentTrend}`);
  console.log(`   Style Usage: ${styleTrend}`);
  console.log(`   Variable Usage: ${variableTrend}`);

  return trends;
}

// Usage
const trendAnalysis = await analyzeTrends(libraryFileKey);
```

### 8. Multi-Library Comparison

```javascript
async function compareLibraries(fileKeys) {
  console.log('⚖️  Library Comparison\n');

  const comparison = await analytics.compareLibraries(fileKeys, {
    period: 'lastMonth',
    metric: 'adoptionRate'
  });

  console.log('🏆 Library Rankings (by Adoption Rate):');
  comparison.libraries.forEach((lib, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
    const score = Math.round(lib.score * 100);
    console.log(`   ${medal} ${lib.fileKey}: ${score}%`);
  });

  console.log(`\n📊 Statistics:`);
  console.log(`   Best: ${Math.round(comparison.rankings.best.score * 100)}%`);
  console.log(`   Worst: ${Math.round(comparison.rankings.worst.score * 100)}%`);
  console.log(`   Average: ${Math.round(comparison.rankings.average * 100)}%`);

  return comparison;
}

// Usage
const libraryComparison = await compareLibraries([
  'library-1-key',
  'library-2-key',
  'library-3-key'
]);
```

## Data Export Examples

### 9. Export Analytics Data

```javascript
async function exportAnalyticsData(fileKey) {
  console.log('💾 Exporting Analytics Data\n');

  // Get comprehensive data
  const healthReport = await analytics.getLibraryHealthReport(fileKey);
  const componentLeaderboard = await analytics.getComponentLeaderboard(fileKey, { limit: 20 });

  // Export to JSON
  const jsonReport = analytics.exportToJSON(healthReport, { pretty: true });
  console.log('📄 Health report exported to JSON');

  // Export leaderboard to CSV
  const csvLeaderboard = analytics.exportToCSV(componentLeaderboard, [
    'rank', 'component_name', 'usage_count', 'type'
  ]);
  console.log('📊 Leaderboard exported to CSV');

  // Save to files (in a real application)
  // await fs.writeFile('health-report.json', jsonReport);
  // await fs.writeFile('component-leaderboard.csv', csvLeaderboard);

  return { jsonReport, csvLeaderboard };
}

// Usage
const exportedData = await exportAnalyticsData(libraryFileKey);
```

## Advanced Usage Examples

### 10. Automated Health Monitoring

```javascript
async function monitorLibraryHealth(fileKeys) {
  console.log('🔍 Automated Health Monitoring\n');

  for (const fileKey of fileKeys) {
    try {
      const healthReport = await analytics.getLibraryHealthReport(fileKey, {
        period: 'lastWeek'
      });

      const score = healthReport.summary.healthScore;
      const adoption = Math.round(healthReport.summary.adoptionRate * 100);

      console.log(`📚 Library: ${fileKey}`);
      
      if (score < 60) {
        console.log(`   ⚠️  ALERT: Low health score (${score}/100)`);
      } else if (score < 80) {
        console.log(`   ⚡ WARNING: Health score needs attention (${score}/100)`);
      } else {
        console.log(`   ✅ GOOD: Healthy library (${score}/100)`);
      }

      if (adoption < 50) {
        console.log(`   📉 Low adoption rate: ${adoption}%`);
      }

      // Check for critical recommendations
      const criticalRecs = healthReport.recommendations.filter(r => r.priority === 'high');
      if (criticalRecs.length > 0) {
        console.log(`   🚨 ${criticalRecs.length} critical recommendations`);
      }

      console.log('');

    } catch (error) {
      console.log(`   ❌ Error monitoring ${fileKey}: ${error.message}\n`);
    }
  }
}

// Usage
await monitorLibraryHealth([
  'library-1-key',
  'library-2-key',
  'library-3-key'
]);
```

### 11. Usage Pattern Analysis

```javascript
async function analyzeUsagePatterns(fileKey) {
  console.log('🔍 Usage Pattern Analysis\n');

  // Get all component usages by file
  const fileUsages = await analytics.getAllData(
    analytics.getComponentUsages,
    fileKey,
    { groupBy: 'file' }
  );

  // Analyze usage distribution
  const usageDistribution = {
    highUsage: fileUsages.filter(f => f.usage_count > 20),
    mediumUsage: fileUsages.filter(f => f.usage_count >= 5 && f.usage_count <= 20),
    lowUsage: fileUsages.filter(f => f.usage_count < 5)
  };

  console.log('📊 File Usage Distribution:');
  console.log(`   High Usage Files (>20 components): ${usageDistribution.highUsage.length}`);
  console.log(`   Medium Usage Files (5-20 components): ${usageDistribution.mediumUsage.length}`);
  console.log(`   Low Usage Files (<5 components): ${usageDistribution.lowUsage.length}\n`);

  // Show top adopter files
  console.log('🏆 Top Library Adopter Files:');
  fileUsages
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, 5)
    .forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.file_name}: ${file.usage_count} components used`);
    });

  return usageDistribution;
}

// Usage
const usagePatterns = await analyzeUsagePatterns(libraryFileKey);
```

## CLI Examples

### Basic CLI Usage

```bash
# Set your token
export FIGMA_TOKEN="your-figma-token"

# Quick health check
figma-library-analytics health-report abc123xyz

# Get component leaderboard
figma-library-analytics component-leaderboard abc123xyz --limit 5

# Export data as JSON for automation
figma-library-analytics component-usages abc123xyz --group-by component --json > components.json

# Compare multiple libraries
figma-library-analytics compare "lib1,lib2,lib3" --metric healthScore --json
```

### Advanced CLI Workflows

```bash
#!/bin/bash
# Library monitoring script

LIBRARIES=("lib1-key" "lib2-key" "lib3-key")

echo "🔍 Daily Library Health Check"
echo "=============================="

for lib in "${LIBRARIES[@]}"; do
  echo "Checking library: $lib"
  
  # Get health score
  health=$(figma-library-analytics health-report "$lib" --json | jq '.summary.healthScore')
  
  if [ "$health" -lt 60 ]; then
    echo "⚠️  CRITICAL: Health score $health/100"
    # Send alert notification
  elif [ "$health" -lt 80 ]; then
    echo "⚡ WARNING: Health score $health/100"
  else
    echo "✅ GOOD: Health score $health/100"
  fi
  
  echo ""
done
```

## Error Handling Examples

### 12. Robust Error Handling

```javascript
import { 
  LibraryAnalyticsError,
  LibraryAnalyticsAuthError,
  LibraryAnalyticsValidationError,
  LibraryAnalyticsRateLimitError
} from 'figma-library-analytics';

async function robustAnalyticsCall(fileKey) {
  try {
    const healthReport = await analytics.getLibraryHealthReport(fileKey);
    return { success: true, data: healthReport };
    
  } catch (error) {
    if (error instanceof LibraryAnalyticsAuthError) {
      console.error('❌ Authentication Error: Check your token and scopes');
      return { success: false, error: 'authentication', retry: false };
      
    } else if (error instanceof LibraryAnalyticsValidationError) {
      console.error('❌ Validation Error:', error.meta);
      return { success: false, error: 'validation', retry: false };
      
    } else if (error instanceof LibraryAnalyticsRateLimitError) {
      console.log(`⏳ Rate limited. Retry after ${error.meta.retryAfter}s`);
      return { success: false, error: 'rate_limit', retryAfter: error.meta.retryAfter };
      
    } else if (error instanceof LibraryAnalyticsError) {
      console.error('❌ API Error:', error.message);
      return { success: false, error: 'api', retry: error.meta?.status >= 500 };
      
    } else {
      console.error('❌ Unexpected Error:', error.message);
      return { success: false, error: 'unknown', retry: false };
    }
  }
}

// Usage with retry logic
async function withRetry(fileKey, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await robustAnalyticsCall(fileKey);
    
    if (result.success) {
      return result.data;
    }
    
    if (!result.retry) {
      throw new Error(`Non-retryable error: ${result.error}`);
    }
    
    if (result.retryAfter) {
      await new Promise(resolve => setTimeout(resolve, result.retryAfter * 1000));
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
    
    console.log(`🔄 Retry attempt ${attempt}/${maxRetries}`);
  }
  
  throw new Error('Max retries exceeded');
}

// Usage
try {
  const healthReport = await withRetry(libraryFileKey);
  console.log('✅ Successfully retrieved health report');
} catch (error) {
  console.error('❌ Failed after all retries:', error.message);
}
```

These examples demonstrate the full capabilities of the Figma Library Analytics library, from basic usage to advanced enterprise scenarios with proper error handling and monitoring workflows.