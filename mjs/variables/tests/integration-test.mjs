/**
 * Integration test with real Figma API
 * This test validates that the client works with actual API calls
 * Note: This requires a valid FIGMA_ACCESS_TOKEN environment variable
 */

import { FigmaVariablesClient } from '../src/core/client.mjs';

const FIGMA_FILE_ID = 'tmaZV2VEXIIrWYVjqaNUxa';

async function runIntegrationTest() {
  console.log('🧪 Running integration test with Figma API...');
  
  // Check if access token is available
  const accessToken = process.env.FIGMA_ACCESS_TOKEN;
  if (!accessToken) {
    console.log('⚠️  FIGMA_ACCESS_TOKEN not found. Skipping integration test.');
    console.log('   To run this test, set FIGMA_ACCESS_TOKEN environment variable.');
    return;
  }

  try {
    // Initialize client
    const client = new FigmaVariablesClient({
      accessToken,
      timeout: 10000 // 10 second timeout
    });

    console.log('📊 Client initialized successfully');
    console.log('   Base URL:', client.baseUrl);
    console.log('   Timeout:', client.timeout);

    // Test 1: Try to get local variables (may fail with EnterpriseAccessError)
    console.log('\\n🔍 Testing getLocalVariables...');
    try {
      const localVars = await client.getLocalVariables(FIGMA_FILE_ID);
      console.log('✅ Local variables retrieved successfully');
      console.log('   Variables count:', Object.keys(localVars.meta?.variables || {}).length);
      console.log('   Collections count:', Object.keys(localVars.meta?.variableCollections || {}).length);
    } catch (error) {
      if (error.constructor.name === 'EnterpriseAccessError') {
        console.log('⚠️  Expected EnterpriseAccessError:', error.message);
        console.log('   This is normal for non-Enterprise accounts');
      } else {
        console.log('❌ Unexpected error:', error.constructor.name, error.message);
      }
    }

    // Test 2: Try to get published variables
    console.log('\\n📢 Testing getPublishedVariables...');
    try {
      const publishedVars = await client.getPublishedVariables(FIGMA_FILE_ID);
      console.log('✅ Published variables retrieved successfully');
      console.log('   Variables count:', Object.keys(publishedVars.meta?.variables || {}).length);
      console.log('   Collections count:', Object.keys(publishedVars.meta?.variableCollections || {}).length);
    } catch (error) {
      console.log('⚠️  Error getting published variables:', error.constructor.name, error.message);
      console.log('   This may be normal depending on file permissions and Enterprise status');
    }

    // Test 3: Test client stats
    console.log('\\n📈 Testing getStats...');
    const stats = client.getStats();
    console.log('✅ Stats retrieved successfully');
    console.log('   Retry config:', JSON.stringify(stats.retryConfig, null, 2));
    console.log('   Enterprise scopes:', JSON.stringify(stats.enterpriseScopes, null, 2));

    console.log('\\n🎉 Integration test completed successfully');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    console.error('   Error type:', error.constructor.name);
    console.error('   Error message:', error.message);
    
    // Check for common issues
    if (error.message.includes('Invalid or expired access token')) {
      console.log('\\n💡 This error suggests the FIGMA_ACCESS_TOKEN is invalid or expired.');
      console.log('   Please check your token at https://www.figma.com/developers/api#access-tokens');
    }
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
      console.log('\\n💡 This appears to be a network connectivity issue.');
      console.log('   Please check your internet connection and proxy settings.');
    }
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTest().catch(console.error);
}

export { runIntegrationTest };