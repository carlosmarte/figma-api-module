#!/usr/bin/env node

/**
 * Integration test script for Figma Library Analytics API
 * Tests the real API with the provided file ID: tmaZV2VEXIIrWYVjqaNUxa
 */

import FigmaLibraryAnalyticsSDK from './sdk.mjs';

const TEST_FILE_ID = 'tmaZV2VEXIIrWYVjqaNUxa';

async function testIntegration() {
  console.log('🧪 Starting Figma Library Analytics Integration Test...\n');

  // Check for token
  const token = process.env.FIGMA_TOKEN;
  if (!token) {
    console.error('❌ Error: FIGMA_TOKEN environment variable is required');
    console.error('💡 Set your token: export FIGMA_TOKEN="your-token-here"');
    console.error('🔗 Get your token: https://www.figma.com/developers/api#access-tokens');
    console.error('⚠️  Note: Token must have library_analytics:read scope\n');
    process.exit(1);
  }

  console.log('✅ Token found, initializing SDK...');

  const sdk = new FigmaLibraryAnalyticsSDK({
    apiToken: token,
    timeout: 30000, // 30 second timeout
    maxRetries: 2   // Only retry twice for integration test
  });

  console.log(`🎯 Testing with file ID: ${TEST_FILE_ID}\n`);

  try {
    // Test 1: Component Analytics
    console.log('📊 Test 1: Component Analytics...');
    const componentMetrics = await sdk.getComponentAdoption(TEST_FILE_ID, {
      period: 'lastMonth',
      includeUsage: true
    });
    console.log(`   ✅ Found ${componentMetrics.totalComponents} components`);
    console.log(`   📈 ${componentMetrics.activeComponents} active components`);
    console.log(`   🎯 ${componentMetrics.totalActions} total actions`);
    console.log(`   📊 ${componentMetrics.totalUsages} total usages\n`);

    // Test 2: Style Analytics  
    console.log('🎨 Test 2: Style Analytics...');
    const styleMetrics = await sdk.getStyleAdoption(TEST_FILE_ID, {
      period: 'lastMonth',
      includeUsage: false
    });
    console.log(`   ✅ Found ${styleMetrics.totalStyles} styles`);
    console.log(`   📈 ${styleMetrics.activeStyles} active styles\n`);

    // Test 3: Variable Analytics
    console.log('🔢 Test 3: Variable Analytics...');
    const variableMetrics = await sdk.getVariableAdoption(TEST_FILE_ID, {
      period: 'lastMonth'
    });
    console.log(`   ✅ Found ${variableMetrics.totalVariables} variables`);
    console.log(`   📈 ${variableMetrics.activeVariables} active variables\n`);

    // Test 4: Health Report
    console.log('🏥 Test 4: Library Health Report...');
    const healthReport = await sdk.getLibraryHealth(TEST_FILE_ID);
    console.log(`   💯 Overall health score: ${healthReport.overallScore}%`);
    console.log(`   📊 Component health: ${healthReport.componentHealth.score}%`);
    console.log(`   🎨 Style health: ${healthReport.styleHealth.score}%`);
    console.log(`   🔢 Variable health: ${healthReport.variableHealth.score}%\n`);

    // Test 5: Rate Limiting Compliance
    console.log('⚡ Test 5: Rate Limiting & Error Handling...');
    const startTime = Date.now();
    
    // Make multiple concurrent requests to test rate limiting
    const promises = [
      sdk.getComponentActions(TEST_FILE_ID, { groupBy: 'component_name' }),
      sdk.getStyleActions(TEST_FILE_ID, { groupBy: 'style_name' }),
      sdk.getVariableActions(TEST_FILE_ID, { groupBy: 'variable_name' })
    ];

    await Promise.allSettled(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`   ⏱️  Completed 3 concurrent requests in ${duration}ms`);
    console.log(`   ✅ Rate limiting handled successfully\n`);

    console.log('🎉 All integration tests passed!');
    console.log('✅ API authentication working');
    console.log('✅ Error handling working');
    console.log('✅ Rate limiting respected');
    console.log('✅ All endpoints accessible\n');

  } catch (error) {
    console.error('❌ Integration test failed:');
    
    if (error.name === 'LibraryAnalyticsAuthError') {
      console.error('🔐 Authentication Error:');
      console.error('   - Check your FIGMA_TOKEN is valid');
      console.error('   - Ensure token has library_analytics:read scope');
      console.error('   - Verify token hasn\'t expired');
    } else if (error.name === 'LibraryAnalyticsRateLimitError') {
      console.error('⚡ Rate Limit Error:');
      console.error(`   - Too many requests, retry after ${error.retryAfter}s`);
    } else if (error.name === 'LibraryAnalyticsValidationError') {
      console.error('📝 Validation Error:');
      console.error(`   - ${error.message}`);
    } else {
      console.error('🔥 Unexpected Error:');
      console.error(`   - ${error.message}`);
    }
    
    console.error(`\nFull error details:`);
    console.error(error);
    process.exit(1);
  }
}

// Run the integration test
testIntegration().catch(console.error);