#!/usr/bin/env node

/**
 * Comprehensive test suite for the Story API endpoints
 * Tests all functionality including saving, loading, deleting, and chunking
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Test configuration
const config = {
  // Change this to your server URL
  baseUrl: 'http://localhost:3000',
  // baseUrl: 'https://your-vercel-app.vercel.app',
  
  // Test data
  testStory: 'This is a test story for the API endpoints. It contains some sample content to verify that the save and load functionality works correctly.',
  largeStoryChunk: 'A'.repeat(1000), // 1KB chunks for testing
  
  // Test settings
  timeout: 30000, // 30 second timeout
  verbose: true
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: []
};

// Color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

// Utility functions
function log(message, color = 'white') {
  if (config.verbose) {
    console.log(colors[color] + message + colors.reset);
  }
}

function logError(message) {
  console.error(colors.red + '❌ ' + message + colors.reset);
}

function logSuccess(message) {
  console.log(colors.green + '✅ ' + message + colors.reset);
}

function logInfo(message) {
  console.log(colors.blue + 'ℹ️  ' + message + colors.reset);
}

function logWarning(message) {
  console.log(colors.yellow + '⚠️  ' + message + colors.reset);
}

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: config.timeout
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (parseError) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: { error: 'Invalid JSON response', rawData: data },
            rawData: data
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Test assertion helper
function assert(condition, message) {
  testResults.total++;
  if (condition) {
    testResults.passed++;
    logSuccess(`TEST PASSED: ${message}`);
    return true;
  } else {
    testResults.failed++;
    const error = `TEST FAILED: ${message}`;
    testResults.errors.push(error);
    logError(error);
    return false;
  }
}

// Test functions
async function testPostStory() {
  logInfo('Testing POST /api/stories (Save Story)');
  
  try {
    const response = await makeRequest(`${config.baseUrl}/api/stories`, {
      method: 'POST',
      body: {
        content: config.testStory
      }
    });

    assert(response.statusCode === 200, 'POST /api/stories returns 200 status');
    assert(response.data.success === true, 'POST /api/stories returns success: true');
    assert(typeof response.data.storyId === 'string', 'POST /api/stories returns a storyId');
    assert(response.data.storyId.length > 0, 'POST /api/stories returns non-empty storyId');
    assert(typeof response.data.expiresAt === 'number', 'POST /api/stories returns expiresAt timestamp');
    assert(response.data.expiresAt > Date.now(), 'POST /api/stories expiresAt is in the future');
    
    // Store the story ID for subsequent tests
    global.testStoryId = response.data.storyId;
    global.testExpiresAt = response.data.expiresAt;
    
    logInfo(`Story saved with ID: ${global.testStoryId}`);
    
  } catch (error) {
    logError(`POST /api/stories test failed: ${error.message}`);
    assert(false, `POST /api/stories completed without error: ${error.message}`);
  }
}

async function testGetStory() {
  logInfo('Testing GET /api/stories (Load Story)');
  
  if (!global.testStoryId) {
    logWarning('Skipping GET test - no story ID from POST test');
    return;
  }
  
  try {
    const response = await makeRequest(`${config.baseUrl}/api/stories?id=${global.testStoryId}`);

    assert(response.statusCode === 200, 'GET /api/stories returns 200 status');
    assert(response.data.success === true, 'GET /api/stories returns success: true');
    assert(typeof response.data.story === 'string', 'GET /api/stories returns story as string');
    
    // Parse the story data
    const storyData = JSON.parse(response.data.story);
    assert(storyData.content === config.testStory, 'GET /api/stories returns correct story content');
    assert(storyData.id === global.testStoryId, 'GET /api/stories returns correct story ID');
    assert(storyData.expiresAt === global.testExpiresAt, 'GET /api/stories returns correct expiration time');
    
    logInfo('Story loaded successfully with correct content');
    
  } catch (error) {
    logError(`GET /api/stories test failed: ${error.message}`);
    assert(false, `GET /api/stories completed without error: ${error.message}`);
  }
}

async function testGetNonExistentStory() {
  logInfo('Testing GET /api/stories with non-existent ID');
  
  try {
    const response = await makeRequest(`${config.baseUrl}/api/stories?id=non-existent-id`);

    assert(response.statusCode === 404, 'GET /api/stories returns 404 for non-existent story');
    assert(response.data.error, 'GET /api/stories returns error message for non-existent story');
    
    logInfo('Non-existent story handled correctly');
    
  } catch (error) {
    logError(`GET non-existent story test failed: ${error.message}`);
    assert(false, `GET non-existent story completed without error: ${error.message}`);
  }
}

async function testDeleteStory() {
  logInfo('Testing DELETE /api/stories (Delete Story)');
  
  if (!global.testStoryId) {
    logWarning('Skipping DELETE test - no story ID from POST test');
    return;
  }
  
  try {
    const response = await makeRequest(`${config.baseUrl}/api/stories?id=${global.testStoryId}`, {
      method: 'DELETE'
    });

    assert(response.statusCode === 200, 'DELETE /api/stories returns 200 status');
    assert(response.data.success === true, 'DELETE /api/stories returns success: true');
    assert(response.data.message, 'DELETE /api/stories returns success message');
    
    logInfo('Story deleted successfully');
    
    // Verify the story is actually deleted
    const verifyResponse = await makeRequest(`${config.baseUrl}/api/stories?id=${global.testStoryId}`);
    assert(verifyResponse.statusCode === 404, 'Deleted story is no longer accessible');
    
    logInfo('Story deletion verified');
    
  } catch (error) {
    logError(`DELETE /api/stories test failed: ${error.message}`);
    assert(false, `DELETE /api/stories completed without error: ${error.message}`);
  }
}

async function testChunkingFunctionality() {
  logInfo('Testing chunking functionality for large stories');
  
  try {
    // Create a large story (5KB)
    const largeStory = config.largeStoryChunk.repeat(5);
    
    // First, save the first chunk
    const firstChunkResponse = await makeRequest(`${config.baseUrl}/api/stories`, {
      method: 'POST',
      body: {
        content: largeStory.substring(0, 1000),
        isFirstChunk: true,
        totalChunks: 5
      }
    });
    
    assert(firstChunkResponse.statusCode === 200, 'First chunk save returns 200 status');
    assert(firstChunkResponse.data.success === true, 'First chunk save returns success: true');
    assert(typeof firstChunkResponse.data.storyId === 'string', 'First chunk save returns storyId');
    
    const chunkStoryId = firstChunkResponse.data.storyId;
    logInfo(`First chunk saved with ID: ${chunkStoryId}`);
    
    // Append remaining chunks
    for (let i = 1; i < 5; i++) {
      const start = i * 1000;
      const end = Math.min((i + 1) * 1000, largeStory.length);
      const chunkContent = largeStory.substring(start, end);
      
      const appendResponse = await makeRequest(`${config.baseUrl}/api/stories/append`, {
        method: 'POST',
        body: {
          content: chunkContent,
          storyId: chunkStoryId,
          chunkIndex: i,
          isLastChunk: i === 4
        }
      });
      
      assert(appendResponse.statusCode === 200, `Chunk ${i} append returns 200 status`);
      assert(appendResponse.data.success === true, `Chunk ${i} append returns success: true`);
      
      logInfo(`Chunk ${i} appended successfully`);
    }
    
    // Verify the complete story
    const completeStoryResponse = await makeRequest(`${config.baseUrl}/api/stories?id=${chunkStoryId}`);
    assert(completeStoryResponse.statusCode === 200, 'Complete chunked story retrieval returns 200 status');
    
    const storyData = JSON.parse(completeStoryResponse.data.story);
    assert(storyData.content === largeStory, 'Complete chunked story content matches original');
    assert(storyData.content.length === largeStory.length, 'Complete chunked story length matches original');
    
    logInfo('Chunking functionality test completed successfully');
    
    // Clean up
    global.chunkStoryId = chunkStoryId;
    
  } catch (error) {
    logError(`Chunking functionality test failed: ${error.message}`);
    assert(false, `Chunking functionality completed without error: ${error.message}`);
  }
}

async function testCleanupEndpoint() {
  logInfo('Testing GET /api/cleanup (Cleanup Expired Stories)');
  
  try {
    // Note: This test might require an API key in production
    const response = await makeRequest(`${config.baseUrl}/api/cleanup`);
    
    // In development, this should work without an API key
    // In production, it might return 401 if we don't have the key
    if (response.statusCode === 401) {
      logWarning('Cleanup endpoint requires API key (expected in production)');
      assert(response.data.error, 'Cleanup endpoint returns error message for unauthorized access');
    } else {
      assert(response.statusCode === 200, 'GET /api/cleanup returns 200 status');
      assert(response.data.success === true, 'GET /api/cleanup returns success: true');
      assert(typeof response.data.deletedCount === 'number', 'GET /api/cleanup returns deleted count');
      assert(typeof response.data.totalProcessed === 'number', 'GET /api/cleanup returns total processed count');
      
      logInfo(`Cleanup completed: ${response.data.deletedCount} deleted, ${response.data.totalProcessed} processed`);
    }
    
  } catch (error) {
    logError(`Cleanup endpoint test failed: ${error.message}`);
    assert(false, `Cleanup endpoint completed without error: ${error.message}`);
  }
}

async function testInvalidRequests() {
  logInfo('Testing invalid request handling');
  
  try {
    // Test POST with no content
    const noContentResponse = await makeRequest(`${config.baseUrl}/api/stories`, {
      method: 'POST',
      body: {}
    });
    assert(noContentResponse.statusCode === 400, 'POST with no content returns 400 status');
    assert(noContentResponse.data.error, 'POST with no content returns error message');
    
    // Test GET with no ID
    const noIdResponse = await makeRequest(`${config.baseUrl}/api/stories`);
    assert(noIdResponse.statusCode === 400, 'GET with no ID returns 400 status');
    assert(noIdResponse.data.error, 'GET with no ID returns error message');
    
    // Test DELETE with no ID
    const deleteNoIdResponse = await makeRequest(`${config.baseUrl}/api/stories`, {
      method: 'DELETE'
    });
    assert(deleteNoIdResponse.statusCode === 400, 'DELETE with no ID returns 400 status');
    assert(deleteNoIdResponse.data.error, 'DELETE with no ID returns error message');
    
    // Test unsupported method
    const unsupportedMethodResponse = await makeRequest(`${config.baseUrl}/api/stories`, {
      method: 'PUT',
      body: { content: 'test' }
    });
    assert(unsupportedMethodResponse.statusCode === 405, 'Unsupported method returns 405 status');
    assert(unsupportedMethodResponse.data.error, 'Unsupported method returns error message');
    
    logInfo('Invalid request handling tests completed');
    
  } catch (error) {
    logError(`Invalid request handling test failed: ${error.message}`);
    assert(false, `Invalid request handling completed without error: ${error.message}`);
  }
}

async function cleanup() {
  logInfo('Cleaning up test data');
  
  // Clean up any remaining test stories
  const storyIds = [global.testStoryId, global.chunkStoryId].filter(Boolean);
  
  for (const storyId of storyIds) {
    try {
      await makeRequest(`${config.baseUrl}/api/stories?id=${storyId}`, {
        method: 'DELETE'
      });
      logInfo(`Cleaned up story: ${storyId}`);
    } catch (error) {
      logWarning(`Failed to clean up story ${storyId}: ${error.message}`);
    }
  }
}

// Main test runner
async function runTests() {
  console.log(colors.magenta + '🧪 Starting Story API Test Suite' + colors.reset);
  console.log(colors.cyan + `Testing against: ${config.baseUrl}` + colors.reset);
  console.log('');
  
  const startTime = Date.now();
  
  try {
    // Run all tests in sequence
    await testPostStory();
    await testGetStory();
    await testGetNonExistentStory();
    await testDeleteStory();
    await testChunkingFunctionality();
    await testCleanupEndpoint();
    await testInvalidRequests();
    
    // Clean up test data
    await cleanup();
    
  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
    testResults.failed++;
    testResults.errors.push(`Test suite error: ${error.message}`);
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Print results
  console.log('');
  console.log(colors.magenta + '📊 Test Results' + colors.reset);
  console.log(colors.cyan + '='.repeat(50) + colors.reset);
  console.log(`Total Tests: ${testResults.total}`);
  console.log(colors.green + `Passed: ${testResults.passed}` + colors.reset);
  console.log(colors.red + `Failed: ${testResults.failed}` + colors.reset);
  console.log(`Duration: ${duration}s`);
  
  if (testResults.failed > 0) {
    console.log('');
    console.log(colors.red + 'Failed Tests:' + colors.reset);
    testResults.errors.forEach(error => console.log(colors.red + `  - ${error}` + colors.reset));
  }
  
  console.log('');
  if (testResults.failed === 0) {
    console.log(colors.green + '🎉 All tests passed!' + colors.reset);
    process.exit(0);
  } else {
    console.log(colors.red + `❌ ${testResults.failed} test(s) failed` + colors.reset);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.length > 2) {
  config.baseUrl = process.argv[2];
}

// Run the tests
runTests().catch(error => {
  logError(`Test suite crashed: ${error.message}`);
  console.error(error);
  process.exit(1);
});