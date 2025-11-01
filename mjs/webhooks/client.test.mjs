/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from 'undici';
import { UndiciFetchAdapter } from '../figma-fetch/dist/index.mjs';
import {
  FigmaWebhooksClient,
  WebhookError,
  WebhookAuthError,
  WebhookRateLimitError,
  WebhookValidationError
} from './client.mjs';

describe('FigmaWebhooksClient', () => {
  let client;
  let mockAgent;
  let originalDispatcher;
  let mockLogger;
  const mockToken = 'figma-token-12345';

  beforeEach(() => {
    originalDispatcher = getGlobalDispatcher();
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);

    mockLogger = {
      debug: jest.fn(),
      log: jest.fn(),
      error: jest.fn()
    };

    client = new FigmaWebhooksClient({
      apiToken: mockToken,
      logger: mockLogger,
      cache: null, // Disable caching for tests
      timeout: 1000, // Short timeout for tests
      fetchAdapter: new UndiciFetchAdapter()
    });
  });

  afterEach(() => {
    setGlobalDispatcher(originalDispatcher);
    mockAgent.close();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with API token', () => {
      expect(client.apiToken).toBe(mockToken);
      expect(client.baseUrl).toBe('https://api.figma.com');
    });

    it('should throw WebhookAuthError without API token', () => {
      const originalToken = process.env.FIGMA_TOKEN;
      delete process.env.FIGMA_TOKEN;

      expect(() => new FigmaWebhooksClient()).toThrow(WebhookAuthError);

      if (originalToken) process.env.FIGMA_TOKEN = originalToken;
    });

    it('should accept custom configuration', () => {
      const customClient = new FigmaWebhooksClient({
        apiToken: mockToken,
        baseUrl: 'https://custom.api.com',
        timeout: 60000,
        fetchAdapter: new UndiciFetchAdapter()
      });

      expect(customClient.baseUrl).toBe('https://custom.api.com');
      expect(customClient.timeout).toBe(60000);
    });
  });

  describe('HTTP Request Handling', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { webhooks: [] };

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v2/webhooks',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.request('/v2/webhooks');

      expect(result).toEqual(mockResponse);
    });

    it.skip('should handle 401 authentication error', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v2/webhooks',
        method: 'GET'
      }).reply(401, { message: 'Unauthorized' });

      await expect(client.request('/v2/webhooks')).rejects.toThrow(WebhookAuthError);
    });

    it.skip('should handle 429 rate limit error', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v2/webhooks',
        method: 'GET'
      }).reply(429, { message: 'Rate limit exceeded' }, {
        headers: {
          'content-type': 'application/json',
          'retry-after': '60'
        }
      });

      await expect(client.request('/v2/webhooks')).rejects.toThrow(WebhookRateLimitError);
    });

    it.skip('should handle generic HTTP errors', async () => {
      const errorResponse = { message: 'Bad Request' };
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v2/webhooks',
        method: 'GET'
      }).reply(400, errorResponse, {
        headers: { 'content-type': 'application/json' }
      });

      await expect(client.request('/v2/webhooks')).rejects.toThrow(WebhookError);
    });

    it.skip('should handle empty responses for DELETE operations', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v2/webhooks/123',
        method: 'DELETE'
      }).reply(204, '');

      const result = await client.request('/v2/webhooks/123', { method: 'DELETE' });
      expect(result).toEqual({ success: true });
    });
  });

  describe('Retry Logic', () => {
    it('should retry on network failures', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');

      // First request fails with network error
      mockPool.intercept({
        path: '/v2/webhooks',
        method: 'GET'
      }).replyWithError(new Error('Network error'));

      // Second request succeeds
      mockPool.intercept({
        path: '/v2/webhooks',
        method: 'GET'
      }).reply(200, { success: true }, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.request('/v2/webhooks');
      expect(result).toEqual({ success: true });
    });

    it.skip('should not retry authentication errors', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v2/webhooks',
        method: 'GET'
      }).reply(401, { message: 'Unauthorized' }, {
        headers: { 'content-type': 'application/json' }
      });

      await expect(client.request('/v2/webhooks')).rejects.toThrow(WebhookAuthError);
    });

    it.skip('should exhaust retries on persistent failures', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');

      // Mock multiple failures for retries
      for (let i = 0; i < 4; i++) {
        mockPool.intercept({
          path: '/v2/webhooks',
          method: 'GET'
        }).replyWithError(new Error('Network error'));
      }

      await expect(client.request('/v2/webhooks')).rejects.toThrow(Error);
    });
  });

  describe('Webhook Operations', () => {
    describe('getWebhooks', () => {
      it('should get webhooks without parameters', async () => {
        const mockResponse = { webhooks: [] };
        const mockPool = mockAgent.get('https://api.figma.com');
        mockPool.intercept({
          path: '/v2/webhooks',
          method: 'GET'
        }).reply(200, mockResponse, {
          headers: { 'content-type': 'application/json' }
        });

        const result = await client.getWebhooks();
        expect(result).toEqual(mockResponse);
      });

      it('should get webhooks with context parameters', async () => {
        const mockResponse = { webhooks: [] };
        const mockPool = mockAgent.get('https://api.figma.com');
        mockPool.intercept({
          path: '/v2/webhooks?context=team&context_id=team123',
          method: 'GET'
        }).reply(200, mockResponse, {
          headers: { 'content-type': 'application/json' }
        });

        const result = await client.getWebhooks({
          context: 'team',
          contextId: 'team123'
        });
        expect(result).toEqual(mockResponse);
      });

      it('should validate context parameter', async () => {
        await expect(client.getWebhooks({ context: 'invalid' }))
          .rejects.toThrow(WebhookValidationError);
      });
    });

    describe('createWebhook', () => {
      const validWebhookData = {
        eventType: 'FILE_UPDATE',
        context: 'file',
        contextId: 'file123',
        endpoint: 'https://example.com/webhook',
        passcode: 'secret123'
      };

      it('should create webhook with valid data', async () => {
        const mockResponse = { id: 'webhook123', ...validWebhookData };
        const mockPool = mockAgent.get('https://api.figma.com');
        mockPool.intercept({
          path: '/v2/webhooks',
          method: 'POST'
        }).reply(200, mockResponse, {
          headers: { 'content-type': 'application/json' }
        });

        const result = await client.createWebhook(validWebhookData);
        expect(result).toEqual(mockResponse);
      });

      it('should validate event type', async () => {
        await expect(client.createWebhook({
          ...validWebhookData,
          eventType: 'INVALID_EVENT'
        })).rejects.toThrow(WebhookValidationError);
      });

      it('should validate context', async () => {
        await expect(client.createWebhook({
          ...validWebhookData,
          context: 'invalid_context'
        })).rejects.toThrow(WebhookValidationError);
      });

      it('should validate endpoint URL length', async () => {
        const longUrl = 'https://example.com/' + 'x'.repeat(2050);
        await expect(client.createWebhook({
          ...validWebhookData,
          endpoint: longUrl
        })).rejects.toThrow(WebhookValidationError);
      });

      it('should validate passcode length', async () => {
        const longPasscode = 'x'.repeat(101);
        await expect(client.createWebhook({
          ...validWebhookData,
          passcode: longPasscode
        })).rejects.toThrow(WebhookValidationError);
      });

      it('should validate description length', async () => {
        const longDescription = 'x'.repeat(151);
        await expect(client.createWebhook({
          ...validWebhookData,
          description: longDescription
        })).rejects.toThrow(WebhookValidationError);
      });
    });

    describe('getWebhook', () => {
      it('should get webhook by ID', async () => {
        const mockResponse = { id: 'webhook123' };
        const mockPool = mockAgent.get('https://api.figma.com');
        mockPool.intercept({
          path: '/v2/webhooks/webhook123',
          method: 'GET'
        }).reply(200, mockResponse, {
          headers: { 'content-type': 'application/json' }
        });

        const result = await client.getWebhook('webhook123');
        expect(result).toEqual(mockResponse);
      });

      it('should validate webhook ID', async () => {
        await expect(client.getWebhook('')).rejects.toThrow(WebhookValidationError);
        await expect(client.getWebhook(null)).rejects.toThrow(WebhookValidationError);
      });
    });

    describe('updateWebhook', () => {
      it('should update webhook with valid data', async () => {
        const mockResponse = { id: 'webhook123', status: 'PAUSED' };
        const mockPool = mockAgent.get('https://api.figma.com');
        mockPool.intercept({
          path: '/v2/webhooks/webhook123',
          method: 'PUT'
        }).reply(200, mockResponse, {
          headers: { 'content-type': 'application/json' }
        });

        const result = await client.updateWebhook('webhook123', {
          status: 'PAUSED',
          description: 'Updated description'
        });
        expect(result).toEqual(mockResponse);
      });

      it('should validate webhook ID', async () => {
        await expect(client.updateWebhook('', {})).rejects.toThrow(WebhookValidationError);
      });

      it('should validate status updates', async () => {
        await expect(client.updateWebhook('webhook123', {
          status: 'INVALID_STATUS'
        })).rejects.toThrow(WebhookValidationError);
      });
    });

    describe('deleteWebhook', () => {
      it.skip('should delete webhook by ID', async () => {
        const mockPool = mockAgent.get('https://api.figma.com');
        mockPool.intercept({
          path: '/v2/webhooks/webhook123',
          method: 'DELETE'
        }).reply(204, '');

        const result = await client.deleteWebhook('webhook123');
        expect(result).toEqual({ success: true });
      });

      it('should validate webhook ID', async () => {
        await expect(client.deleteWebhook('')).rejects.toThrow(WebhookValidationError);
      });
    });

    describe('getWebhookRequests', () => {
      it('should get webhook request history', async () => {
        const mockResponse = { requests: [] };
        const mockPool = mockAgent.get('https://api.figma.com');
        mockPool.intercept({
          path: '/v2/webhooks/webhook123/requests',
          method: 'GET'
        }).reply(200, mockResponse, {
          headers: { 'content-type': 'application/json' }
        });

        const result = await client.getWebhookRequests('webhook123');
        expect(result).toEqual(mockResponse);
      });

      it('should validate webhook ID', async () => {
        await expect(client.getWebhookRequests('')).rejects.toThrow(WebhookValidationError);
      });
    });
  });

  describe('Convenience Methods', () => {
    it('should pause webhook', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v2/webhooks/webhook123',
        method: 'PUT'
      }).reply(200, { id: 'webhook123', status: 'PAUSED' }, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.pauseWebhook('webhook123');
      expect(result.status).toBe('PAUSED');
    });

    it('should activate webhook', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v2/webhooks/webhook123',
        method: 'PUT'
      }).reply(200, { id: 'webhook123', status: 'ACTIVE' }, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.activateWebhook('webhook123');
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('Pagination', () => {
    it('should paginate through webhook results', async () => {
      const page1 = {
        webhooks: [{ id: 'webhook1' }],
        pagination: { next_page: 'https://api.figma.com/v2/webhooks?cursor=next123' }
      };

      const page2 = {
        webhooks: [{ id: 'webhook2' }],
        pagination: {}
      };

      const mockPool = mockAgent.get('https://api.figma.com');

      // First page
      mockPool.intercept({
        path: '/v2/webhooks?plan_api_id=plan123',
        method: 'GET'
      }).reply(200, page1, {
        headers: { 'content-type': 'application/json' }
      });

      // Second page with cursor
      mockPool.intercept({
        path: '/v2/webhooks?plan_api_id=plan123&cursor=next123',
        method: 'GET'
      }).reply(200, page2, {
        headers: { 'content-type': 'application/json' }
      });

      const results = [];
      for await (const batch of client.paginateWebhooks('plan123')) {
        results.push(...batch);
      }

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('webhook1');
      expect(results[1].id).toBe('webhook2');
    });
  });

  describe('Signature Verification', () => {
    it('should verify webhook signature', () => {
      const payload = '{"event":"test"}';
      const signature = 'secret123';
      const passcode = 'secret123';

      const isValid = client.verifyWebhookSignature(payload, signature, passcode);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = '{"event":"test"}';
      const signature = 'invalid';
      const passcode = 'secret123';

      const isValid = client.verifyWebhookSignature(payload, signature, passcode);
      expect(isValid).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it.skip('should use rate limiter when provided', async () => {
      const mockRateLimiter = {
        checkLimit: jest.fn().mockResolvedValue(true)
      };

      const clientWithRateLimit = new FigmaWebhooksClient({
        apiToken: mockToken,
        rateLimiter: mockRateLimiter,
        fetchAdapter: new UndiciFetchAdapter()
      });

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v2/webhooks',
        method: 'GET'
      }).reply(200, {}, {
        headers: { 'content-type': 'application/json' }
      });

      await clientWithRateLimit.request('/v2/webhooks');

      expect(mockRateLimiter.checkLimit).toHaveBeenCalled();
    });
  });

  describe('Caching', () => {
    it.skip('should use cache for GET requests when provided', async () => {
      const mockCache = {
        get: jest.fn().mockResolvedValue({ cached: true }),
        set: jest.fn().mockResolvedValue(true)
      };

      const clientWithCache = new FigmaWebhooksClient({
        apiToken: mockToken,
        cache: mockCache,
        fetchAdapter: new UndiciFetchAdapter()
      });

      const result = await clientWithCache.request('/v2/webhooks');

      expect(mockCache.get).toHaveBeenCalled();
      expect(result).toEqual({ cached: true });
    });

    it.skip('should update cache after successful GET request', async () => {
      const mockCache = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(true)
      };

      const clientWithCache = new FigmaWebhooksClient({
        apiToken: mockToken,
        cache: mockCache,
        fetchAdapter: new UndiciFetchAdapter()
      });

      const responseData = { webhooks: [] };
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v2/webhooks',
        method: 'GET'
      }).reply(200, responseData, {
        headers: { 'content-type': 'application/json' }
      });

      await clientWithCache.request('/v2/webhooks');

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.any(String),
        responseData,
        { ttl: 300 }
      );
    });
  });
});