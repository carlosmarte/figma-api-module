/**
 * Tests for FigmaDevResourcesClient
 */

import { jest } from '@jest/globals';
import { 
  FigmaDevResourcesClient, 
  FigmaApiError, 
  FigmaRateLimitError, 
  FigmaAuthError, 
  FigmaValidationError 
} from './client.mjs';

// Mock fetch globally
global.fetch = jest.fn();

describe('FigmaDevResourcesClient', () => {
  let client;
  const mockAccessToken = 'test-token';
  const mockBaseUrl = 'https://api.figma.com';

  beforeEach(() => {
    client = new FigmaDevResourcesClient({
      accessToken: mockAccessToken,
      baseUrl: mockBaseUrl
    });
    fetch.mockClear();
  });

  describe('constructor', () => {
    it('should create client with required access token', () => {
      expect(client.accessToken).toBe(mockAccessToken);
      expect(client.baseUrl).toBe(mockBaseUrl);
    });

    it('should throw FigmaAuthError if no access token provided', () => {
      expect(() => {
        new FigmaDevResourcesClient({});
      }).toThrow(FigmaAuthError);
    });

    it('should use default base URL if not provided', () => {
      const defaultClient = new FigmaDevResourcesClient({
        accessToken: mockAccessToken
      });
      expect(defaultClient.baseUrl).toBe('https://api.figma.com');
    });
  });

  describe('getDevResources', () => {
    const mockFileKey = 'test-file-key';
    const mockResponse = {
      dev_resources: [
        {
          id: 'resource-1',
          name: 'Test Resource',
          url: 'https://example.com',
          file_key: mockFileKey,
          node_id: 'node-1'
        }
      ]
    };

    it('should fetch dev resources successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await client.getDevResources(mockFileKey);

      expect(fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v1/files/${mockFileKey}/dev_resources`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should include node_ids query parameter when provided', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const nodeIds = ['node-1', 'node-2'];
      await client.getDevResources(mockFileKey, { nodeIds });

      expect(fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v1/files/${mockFileKey}/dev_resources?node_ids=node-1%2Cnode-2`,
        expect.any(Object)
      );
    });

    it('should throw FigmaValidationError if file key is missing', async () => {
      await expect(client.getDevResources()).rejects.toThrow(FigmaValidationError);
    });

    it('should handle string nodeIds parameter', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      await client.getDevResources(mockFileKey, { nodeIds: 'node-1,node-2' });

      expect(fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v1/files/${mockFileKey}/dev_resources?node_ids=node-1%2Cnode-2`,
        expect.any(Object)
      );
    });
  });

  describe('createDevResources', () => {
    const mockDevResources = [
      {
        name: 'Test Resource',
        url: 'https://example.com',
        file_key: 'test-file',
        node_id: 'node-1'
      }
    ];

    const mockResponse = {
      links_created: [
        {
          id: 'resource-1',
          name: 'Test Resource',
          url: 'https://example.com',
          file_key: 'test-file',
          node_id: 'node-1'
        }
      ],
      errors: []
    };

    it('should create dev resources successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await client.createDevResources(mockDevResources);

      expect(fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v1/dev_resources`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ dev_resources: mockDevResources }),
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw FigmaValidationError for empty array', async () => {
      await expect(client.createDevResources([])).rejects.toThrow(FigmaValidationError);
    });

    it('should throw FigmaValidationError for non-array input', async () => {
      await expect(client.createDevResources({})).rejects.toThrow(FigmaValidationError);
    });

    it('should validate required fields', async () => {
      const invalidResource = [{ name: 'Test' }]; // Missing required fields

      await expect(client.createDevResources(invalidResource)).rejects.toThrow(FigmaValidationError);
    });

    it('should validate URL format', async () => {
      const invalidUrlResource = [
        {
          name: 'Test Resource',
          url: 'invalid-url',
          file_key: 'test-file',
          node_id: 'node-1'
        }
      ];

      await expect(client.createDevResources(invalidUrlResource)).rejects.toThrow(FigmaValidationError);
    });
  });

  describe('updateDevResources', () => {
    const mockDevResources = [
      {
        id: 'resource-1',
        name: 'Updated Resource',
        url: 'https://updated.example.com'
      }
    ];

    const mockResponse = {
      links_updated: [
        {
          id: 'resource-1',
          name: 'Updated Resource',
          url: 'https://updated.example.com',
          file_key: 'test-file',
          node_id: 'node-1'
        }
      ],
      errors: []
    };

    it('should update dev resources successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await client.updateDevResources(mockDevResources);

      expect(fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v1/dev_resources`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ dev_resources: mockDevResources })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw FigmaValidationError if resource ID is missing', async () => {
      const invalidResource = [{ name: 'Test' }]; // Missing id

      await expect(client.updateDevResources(invalidResource)).rejects.toThrow(FigmaValidationError);
    });
  });

  describe('deleteDevResource', () => {
    const mockFileKey = 'test-file';
    const mockResourceId = 'resource-1';

    it('should delete dev resource successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({})
      });

      await client.deleteDevResource(mockFileKey, mockResourceId);

      expect(fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v1/files/${mockFileKey}/dev_resources/${mockResourceId}`,
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should throw FigmaValidationError if file key is missing', async () => {
      await expect(client.deleteDevResource(null, mockResourceId)).rejects.toThrow(FigmaValidationError);
    });

    it('should throw FigmaValidationError if resource ID is missing', async () => {
      await expect(client.deleteDevResource(mockFileKey, null)).rejects.toThrow(FigmaValidationError);
    });
  });

  describe('error handling', () => {
    it('should throw FigmaRateLimitError for 429 status', async () => {
      fetch.mockResolvedValueOnce({
        status: 429,
        headers: {
          get: jest.fn().mockReturnValue('60')
        }
      });

      await expect(client.getDevResources('test-file')).rejects.toThrow(FigmaRateLimitError);
    });

    it('should throw FigmaAuthError for 401 status', async () => {
      fetch.mockResolvedValueOnce({
        status: 401
      });

      await expect(client.getDevResources('test-file')).rejects.toThrow(FigmaAuthError);
    });

    it('should throw FigmaApiError for 403 status', async () => {
      fetch.mockResolvedValueOnce({
        status: 403
      });

      await expect(client.getDevResources('test-file')).rejects.toThrow(FigmaApiError);
    });

    it('should throw FigmaApiError for other HTTP errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValueOnce({ message: 'Server error' })
      });

      await expect(client.getDevResources('test-file')).rejects.toThrow(FigmaApiError);
    });
  });

  describe('retry logic', () => {
    it('should retry on rate limit error', async () => {
      // First call fails with rate limit
      fetch.mockResolvedValueOnce({
        status: 429,
        headers: {
          get: jest.fn().mockReturnValue('1')
        }
      });

      // Second call succeeds
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ dev_resources: [] })
      });

      const result = await client.getDevResources('test-file');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ dev_resources: [] });
    });

    it('should not retry on authentication errors', async () => {
      fetch.mockResolvedValueOnce({
        status: 401
      });

      await expect(client.getDevResources('test-file')).rejects.toThrow(FigmaAuthError);
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('batch operations', () => {
    it('should handle batch create with progress callback', async () => {
      const mockResources = [
        { name: 'Resource 1', url: 'https://example1.com', file_key: 'file1', node_id: 'node1' },
        { name: 'Resource 2', url: 'https://example2.com', file_key: 'file1', node_id: 'node2' }
      ];

      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          links_created: mockResources.map((r, i) => ({ ...r, id: `id-${i}` })),
          errors: []
        })
      });

      const progressCallback = jest.fn();
      const result = await client.batchCreateDevResources(mockResources, progressCallback, 1);

      expect(result.links_created).toHaveLength(2);
      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('multi-file operations', () => {
    it('should get dev resources for multiple files', async () => {
      const mockFileKeys = ['file1', 'file2'];
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ dev_resources: [{ id: '1' }] })
      });
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ dev_resources: [{ id: '2' }] })
      });

      const result = await client.getMultipleFileDevResources(mockFileKeys);

      expect(result).toHaveProperty('file1');
      expect(result).toHaveProperty('file2');
      expect(result.file1.dev_resources).toHaveLength(1);
      expect(result.file2.dev_resources).toHaveLength(1);
    });

    it('should handle errors for individual files', async () => {
      const mockFileKeys = ['file1', 'file2'];
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ dev_resources: [{ id: '1' }] })
      });
      
      fetch.mockResolvedValueOnce({
        status: 404
      });

      const result = await client.getMultipleFileDevResources(mockFileKeys);

      expect(result.file1.dev_resources).toHaveLength(1);
      expect(result.file2.error).toBeDefined();
      expect(result.file2.dev_resources).toHaveLength(0);
    });
  });
});