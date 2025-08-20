/**
 * Unit tests for FigmaComponentsClient
 */

import { jest } from '@jest/globals';
import { FigmaComponentsClient } from '../../src/core/client.mjs';
import { 
  AuthenticationError, 
  RateLimitError,
  ValidationError 
} from '../../src/core/exceptions.mjs';

// Mock fetch globally
global.fetch = jest.fn();

describe('FigmaComponentsClient', () => {
  let client;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };

    client = new FigmaComponentsClient({
      apiToken: 'test-token',
      logger: mockLogger
    });

    fetch.mockClear();
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
      
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.get('/v1/teams/123/components');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/teams/123/components',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-Figma-Token': 'test-token',
            'Content-Type': 'application/json'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle query parameters', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      });

      await client.get('/v1/teams/123/components', {
        page_size: 50,
        after: 100
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/teams/123/components?page_size=50&after=100',
        expect.any(Object)
      );
    });

    it('should handle 404 errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map(),
        json: () => Promise.resolve({ message: 'Team not found' })
      });

      await expect(client.get('/v1/teams/123/components')).rejects.toThrow();
    });

    it('should handle rate limit errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['retry-after', '60']]),
        json: () => Promise.resolve({})
      });

      await expect(client.get('/v1/teams/123/components')).rejects.toThrow(RateLimitError);
    });
  });

  describe('rate limiting', () => {
    it('should track request timestamps', async () => {
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      });

      expect(client.requestTimestamps).toHaveLength(0);

      await client.get('/v1/teams/123/components');

      expect(client.requestTimestamps).toHaveLength(1);
    });
  });

  describe('health check', () => {
    it('should return true for successful health check', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'test-user' })
      });

      const isHealthy = await client.healthCheck();

      expect(isHealthy).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/me',
        expect.any(Object)
      );
    });

    it('should return false for failed health check', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

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