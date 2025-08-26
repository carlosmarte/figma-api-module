/**
 * Unit tests for FigmaComponentsClient
 */

import { jest } from '@jest/globals';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from 'undici';
import { FigmaComponentsClient } from '../../src/core/client.mjs';
import { 
  AuthenticationError, 
  RateLimitError,
  ValidationError 
} from '../../src/core/exceptions.mjs';

describe('FigmaComponentsClient', () => {
  let client;
  let mockLogger;
  let mockAgent;
  let originalDispatcher;

  beforeEach(() => {
    originalDispatcher = getGlobalDispatcher();
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };

    client = new FigmaComponentsClient({
      apiToken: 'test-token',
      logger: mockLogger
    });
  });

  afterEach(() => {
    setGlobalDispatcher(originalDispatcher);
    mockAgent.close();
  });

  describe('constructor', () => {
    it('should throw error when API token is missing', () => {
      expect(() => {
        new FigmaComponentsClient({});
      }).toThrow(AuthenticationError);
    });

    it('should initialize with default configuration', () => {
      const client = new FigmaComponentsClient({
        apiToken: 'test-token'
      });

      expect(client.apiToken).toBe('test-token');
      expect(client.baseUrl).toBe('https://api.figma.com');
      expect(client.timeout).toBe(30000);
    });

    it('should initialize with custom configuration', () => {
      const client = new FigmaComponentsClient({
        apiToken: 'test-token',
        baseUrl: 'https://custom.api.com/',
        timeout: 5000
      });

      expect(client.baseUrl).toBe('https://custom.api.com');
      expect(client.timeout).toBe(5000);
    });
  });

  describe('request handling', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { components: [] };
      
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool
        .intercept({
          path: '/v1/teams/123/components',
          method: 'GET'
        })
        .reply(200, mockResponse, {
          headers: { 'content-type': 'application/json' }
        });

      const result = await client.get('/v1/teams/123/components');
      expect(result).toEqual(mockResponse);
    });

    it('should handle query parameters', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool
        .intercept({
          path: '/v1/teams/123/components?page_size=50&after=100',
          method: 'GET'
        })
        .reply(200, {}, {
          headers: { 'content-type': 'application/json' }
        });

      const result = await client.get('/v1/teams/123/components', {
        page_size: 50,
        after: 100
      });

      expect(result).toEqual({});
    });

    it('should handle 404 errors', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool
        .intercept({
          path: '/v1/teams/123/components',
          method: 'GET'
        })
        .reply(404, { message: 'Team not found' }, {
          headers: { 'content-type': 'application/json' }
        });

      await expect(client.get('/v1/teams/123/components')).rejects.toThrow();
    });

    it('should handle rate limit errors', async () => {
      // Create a client with no retries for this test
      const testClient = new FigmaComponentsClient({
        apiToken: 'test-token',
        logger: mockLogger,
        retryConfig: { maxRetries: 0 }
      });

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool
        .intercept({
          path: '/v1/teams/123/components',
          method: 'GET'
        })
        .reply(429, {}, {
          headers: { 
            'content-type': 'application/json',
            'retry-after': '60'
          }
        });

      await expect(testClient.get('/v1/teams/123/components')).rejects.toThrow(RateLimitError);
    });
  });

  describe('rate limiting', () => {
    it('should track request timestamps', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool
        .intercept({
          path: '/v1/teams/123/components',
          method: 'GET'
        })
        .reply(200, {}, {
          headers: { 'content-type': 'application/json' }
        });

      expect(client.requestTimestamps).toHaveLength(0);

      await client.get('/v1/teams/123/components');

      expect(client.requestTimestamps).toHaveLength(1);
    });
  });

  describe('health check', () => {
    it('should return true for successful health check', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool
        .intercept({
          path: '/v1/me',
          method: 'GET'
        })
        .reply(200, { id: 'test-user' }, {
          headers: { 'content-type': 'application/json' }
        });

      const isHealthy = await client.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should return false for failed health check', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool
        .intercept({
          path: '/v1/me',
          method: 'GET'
        })
        .replyWithError(new Error('Network error'));

      const isHealthy = await client.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe('statistics', () => {
    it('should track request statistics', () => {
      const stats = client.getStats();

      expect(stats).toEqual({
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        retryAttempts: 0,
        rateLimitHits: 0,
        successRate: '0%'
      });
    });

    it('should reset statistics', () => {
      client.stats.totalRequests = 5;
      client.resetStats();

      expect(client.stats.totalRequests).toBe(0);
    });
  });
});