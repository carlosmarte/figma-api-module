/**
 * Test helper for mocking fetch adapters
 * Provides a standardized way to mock fetch responses across all module tests
 */

/**
 * Create a mock fetch adapter for testing
 * @param {Function} mockFetch - Jest mock function
 * @returns {Object} Mock fetch adapter
 */
export function createMockFetchAdapter(mockFetch) {
  return {
    fetch: mockFetch
  };
}

/**
 * Create a standardized mock response
 * @param {Object} options - Response options
 * @param {number} options.status - HTTP status code
 * @param {string} options.statusText - HTTP status text
 * @param {Object} options.data - Response data
 * @param {Object} options.headers - Response headers
 * @param {boolean} options.ok - Whether response is OK
 * @returns {Object} Mock response object
 */
export function createMockResponse({
  status = 200,
  statusText = 'OK',
  data = {},
  headers = {},
  ok = status >= 200 && status < 300
} = {}) {
  return {
    ok,
    status,
    statusText,
    headers: {
      entries: () => Object.entries(headers).entries(),
      get: (key) => headers[key] || null
    },
    data
  };
}

/**
 * Create a mock error response
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 * @param {string} statusText - HTTP status text
 * @returns {Object} Mock error response
 */
export function createMockErrorResponse(status, message = 'Error', statusText = 'Error') {
  return createMockResponse({
    status,
    statusText,
    data: { error: message, message },
    ok: false
  });
}

/**
 * Setup environment for tests
 * Temporarily removes FIGMA_TOKEN to test authentication errors
 * @param {Function} fn - Test function
 * @returns {Function} Wrapped test function
 */
export function withoutFigmaToken(fn) {
  return () => {
    const originalToken = process.env.FIGMA_TOKEN;
    delete process.env.FIGMA_TOKEN;

    try {
      return fn();
    } finally {
      if (originalToken) process.env.FIGMA_TOKEN = originalToken;
    }
  };
}

/**
 * Setup environment for async tests
 * Temporarily removes FIGMA_TOKEN to test authentication errors
 * @param {Function} fn - Async test function
 * @returns {Function} Wrapped async test function
 */
export async function withoutFigmaTokenAsync(fn) {
  const originalToken = process.env.FIGMA_TOKEN;
  delete process.env.FIGMA_TOKEN;

  try {
    return await fn();
  } finally {
    if (originalToken) process.env.FIGMA_TOKEN = originalToken;
  }
}
