/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { 
  FigmaWebhooksClient, 
  WebhookError, 
  WebhookAuthError, 
  WebhookRateLimitError,
  WebhookValidationError 
} from './client.mjs';

// Create a mock fetch function
const mockFetch = jest.fn(() => {
  throw new Error('Mock fetch called without specific implementation');
});

describe('FigmaWebhooksClient', () => {
  let client;
  const mockToken = 'figma-token-12345';

  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockReset();
    client = new FigmaWebhooksClient({
      apiToken: mockToken,
      logger: { debug: jest.fn(), log: jest.fn(), error: jest.fn() },
      cache: null, // Disable caching for tests
      timeout: 1000, // Short timeout for tests
      fetchFunction: mockFetch
    });
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
        timeout: 60000
      });

      expect(customClient.baseUrl).toBe('https://custom.api.com');
      expect(customClient.timeout).toBe(60000);
    });
  });

  describe('HTTP Request Handling', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { webhooks: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.request('/v2/webhooks');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.figma.com/v2/webhooks',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle 401 authentication error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ message: 'Unauthorized' })
      });

      await expect(client.request('/v2/webhooks')).rejects.toThrow(WebhookAuthError);
    });

    it('should handle 429 rate limit error', async () => {
      const mockHeaders = {
        get: jest.fn().mockImplementation((name) => {
          if (name === 'Retry-After') return '60';
          return null;
        })
      };
      
      // Test the error handling directly
      const mockResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: mockHeaders,
        json: () => Promise.resolve({ message: 'Rate limit exceeded' })
      };
      
      // Override the fetch function to return our mock response
      client.fetch = jest.fn().mockResolvedValueOnce(mockResponse);

      // Test via request method
      await expect(client.request('/v2/webhooks')).rejects.toThrow(WebhookRateLimitError);
    });

    it('should handle generic HTTP errors', async () => {
      const errorResponse = { message: 'Bad Request' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve(errorResponse)
      });

      await expect(client.request('/v2/webhooks')).rejects.toThrow(WebhookError);
    });

    it('should handle empty responses for DELETE operations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers()
      });

      const result = await client.request('/v2/webhooks/123', { method: 'DELETE' });
      expect(result).toEqual({ success: true });
    });
  });

  describe('Retry Logic', () => {
    it('should retry on network failures', async () => {
      fetch
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ success: true })
        });

      const result = await client.request('/v2/webhooks');
      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ message: 'Unauthorized' })
      });

      await expect(client.request('/v2/webhooks')).rejects.toThrow(WebhookAuthError);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries on persistent failures', async () => {
      mockFetch.mockRejectedValue(new TypeError('Network error'));

      await expect(client.request('/v2/webhooks')).rejects.toThrow(TypeError);
      expect(fetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('Webhook Operations', () => {
    describe('getWebhooks', () => {
      it('should get webhooks without parameters', async () => {
        const mockResponse = { webhooks: [] };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(mockResponse)
        });

        const result = await client.getWebhooks();

        expect(fetch).toHaveBeenCalledWith(
          'https://api.figma.com/v2/webhooks',
          expect.any(Object)
        );
        expect(result).toEqual(mockResponse);
      });

      it('should get webhooks with context parameters', async () => {
        const mockResponse = { webhooks: [] };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(mockResponse)
        });

        await client.getWebhooks({
          context: 'team',
          contextId: 'team123'
        });

        expect(fetch).toHaveBeenCalledWith(
          'https://api.figma.com/v2/webhooks?context=team&context_id=team123',
          expect.any(Object)
        );
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
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(mockResponse)
        });

        const result = await client.createWebhook(validWebhookData);

        expect(fetch).toHaveBeenCalledWith(
          'https://api.figma.com/v2/webhooks',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              event_type: 'FILE_UPDATE',
              context: 'file',
              context_id: 'file123',
              endpoint: 'https://example.com/webhook',
              passcode: 'secret123',
              status: 'ACTIVE'
            })
          })
        );
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
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(mockResponse)
        });

        const result = await client.getWebhook('webhook123');

        expect(fetch).toHaveBeenCalledWith(
          'https://api.figma.com/v2/webhooks/webhook123',
          expect.any(Object)
        );
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
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(mockResponse)
        });

        const result = await client.updateWebhook('webhook123', {
          status: 'PAUSED',
          description: 'Updated description'
        });

        expect(fetch).toHaveBeenCalledWith(
          'https://api.figma.com/v2/webhooks/webhook123',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({
              status: 'PAUSED',
              description: 'Updated description'
            })
          })
        );
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
      it('should delete webhook by ID', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 204,
          headers: new Headers()
        });

        const result = await client.deleteWebhook('webhook123');

        expect(fetch).toHaveBeenCalledWith(
          'https://api.figma.com/v2/webhooks/webhook123',
          expect.objectContaining({ method: 'DELETE' })
        );
        expect(result).toEqual({ success: true });
      });

      it('should validate webhook ID', async () => {
        await expect(client.deleteWebhook('')).rejects.toThrow(WebhookValidationError);
      });
    });

    describe('getWebhookRequests', () => {
      it('should get webhook request history', async () => {
        const mockResponse = { requests: [] };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(mockResponse)
        });

        const result = await client.getWebhookRequests('webhook123');

        expect(fetch).toHaveBeenCalledWith(
          'https://api.figma.com/v2/webhooks/webhook123/requests',
          expect.any(Object)
        );
        expect(result).toEqual(mockResponse);
      });

      it('should validate webhook ID', async () => {
        await expect(client.getWebhookRequests('')).rejects.toThrow(WebhookValidationError);
      });
    });
  });

  describe('Convenience Methods', () => {
    beforeEach(() => {
      // Mock successful update response
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ id: 'webhook123', status: 'PAUSED' })
      });
    });

    it('should pause webhook', async () => {
      await client.pauseWebhook('webhook123');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.figma.com/v2/webhooks/webhook123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'PAUSED' })
        })
      );
    });

    it('should activate webhook', async () => {
      await client.activateWebhook('webhook123');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.figma.com/v2/webhooks/webhook123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'ACTIVE' })
        })
      );
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

      fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(page1)
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(page2)
        });

      const results = [];
      for await (const batch of client.paginateWebhooks('plan123')) {
        results.push(...batch);
      }

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('webhook1');
      expect(results[1].id).toBe('webhook2');
      expect(fetch).toHaveBeenCalledTimes(2);
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
    it('should use rate limiter when provided', async () => {
      const mockRateLimiter = {
        checkLimit: jest.fn().mockResolvedValue(true)
      };

      const clientWithRateLimit = new FigmaWebhooksClient({
        apiToken: mockToken,
        rateLimiter: mockRateLimiter
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({})
      });

      await clientWithRateLimit.request('/v2/webhooks');

      expect(mockRateLimiter.checkLimit).toHaveBeenCalled();
    });
  });

  describe('Caching', () => {
    it('should use cache for GET requests when provided', async () => {
      const mockCache = {
        get: jest.fn().mockResolvedValue({ cached: true }),
        set: jest.fn().mockResolvedValue(true)
      };

      const clientWithCache = new FigmaWebhooksClient({
        apiToken: mockToken,
        cache: mockCache
      });

      const result = await clientWithCache.request('/v2/webhooks');

      expect(mockCache.get).toHaveBeenCalled();
      expect(result).toEqual({ cached: true });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should update cache after successful GET request', async () => {
      const mockCache = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(true)
      };

      const clientWithCache = new FigmaWebhooksClient({
        apiToken: mockToken,
        cache: mockCache
      });

      const responseData = { webhooks: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(responseData)
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