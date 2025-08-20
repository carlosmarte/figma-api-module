/**
 * Tests for FigmaLibraryAnalyticsClient
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
  FigmaLibraryAnalyticsClient,
  LibraryAnalyticsError,
  LibraryAnalyticsAuthError,
  LibraryAnalyticsValidationError,
  LibraryAnalyticsRateLimitError
} from './client.mjs';

// Mock fetch globally
global.fetch = jest.fn();

describe('FigmaLibraryAnalyticsClient', () => {
  let client;
  const mockApiToken = 'test-token';
  const mockFileKey = 'test-file-key';

  beforeEach(() => {
    jest.clearAllMocks();
    client = new FigmaLibraryAnalyticsClient({
      apiToken: mockApiToken
    });
  });

  describe('Constructor', () => {
    test('should initialize with valid token', () => {
      expect(client.apiToken).toBe(mockApiToken);
      expect(client.baseUrl).toBe('https://api.figma.com');
    });

    test('should throw error without token', () => {
      expect(() => {
        new FigmaLibraryAnalyticsClient();
      }).toThrow(LibraryAnalyticsAuthError);
    });

    test('should use custom base URL', () => {
      const customClient = new FigmaLibraryAnalyticsClient({
        apiToken: mockApiToken,
        baseUrl: 'https://custom.api.com'
      });
      expect(customClient.baseUrl).toBe('https://custom.api.com');
    });
  });

  describe('Validation Methods', () => {
    test('should validate valid file key', () => {
      expect(() => {
        client._validateFileKey('valid-file-key-123');
      }).not.toThrow();
    });

    test('should reject invalid file key', () => {
      expect(() => {
        client._validateFileKey('invalid@file#key');
      }).toThrow(LibraryAnalyticsValidationError);
    });

    test('should validate groupBy for component actions', () => {
      expect(() => {
        client._validateGroupBy('component', 'componentActions');
      }).not.toThrow();

      expect(() => {
        client._validateGroupBy('team', 'componentActions');
      }).not.toThrow();

      expect(() => {
        client._validateGroupBy('invalid', 'componentActions');
      }).toThrow(LibraryAnalyticsValidationError);
    });

    test('should validate date format', () => {
      expect(() => {
        client._validateDate('2023-12-01', 'start_date');
      }).not.toThrow();

      expect(() => {
        client._validateDate('invalid-date', 'start_date');
      }).toThrow(LibraryAnalyticsValidationError);
    });
  });

  describe('HTTP Request Handling', () => {
    test('should make successful request', async () => {
      const mockResponse = {
        component_actions: [
          { component_name: 'Button', action_count: 10 }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await client.request('/test-path');
      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.figma.com/test-path',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockApiToken}`,
            'Content-Type': 'application/json'
          })
        })
      );
    });

    test('should handle 401 authentication error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValueOnce({})
      });

      await expect(client.request('/test-path')).rejects.toThrow(LibraryAnalyticsAuthError);
    });

    test('should handle 403 forbidden error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: jest.fn().mockResolvedValueOnce({})
      });

      await expect(client.request('/test-path')).rejects.toThrow(LibraryAnalyticsError);
    });

    test('should handle 429 rate limit error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Map([['Retry-After', '60']])
      });

      await expect(client.request('/test-path')).rejects.toThrow(LibraryAnalyticsRateLimitError);
    });
  });

  describe('Component Analytics Methods', () => {
    test('should get component actions', async () => {
      const mockResponse = {
        component_actions: [
          { component_name: 'Button', action_count: 5 }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await client.getComponentActions(mockFileKey, {
        groupBy: 'component'
      });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/analytics/libraries/test-file-key/component/actions'),
        expect.any(Object)
      );
    });

    test('should require groupBy for component actions', async () => {
      await expect(
        client.getComponentActions(mockFileKey, {})
      ).rejects.toThrow(LibraryAnalyticsValidationError);
    });

    test('should get component usages', async () => {
      const mockResponse = {
        component_usages: [
          { component_name: 'Button', usage_count: 15 }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await client.getComponentUsages(mockFileKey, {
        groupBy: 'component'
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Style Analytics Methods', () => {
    test('should get style actions', async () => {
      const mockResponse = {
        style_actions: [
          { style_name: 'Primary Color', action_count: 8 }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await client.getStyleActions(mockFileKey, {
        groupBy: 'style'
      });

      expect(result).toEqual(mockResponse);
    });

    test('should get style usages', async () => {
      const mockResponse = {
        style_usages: [
          { style_name: 'Primary Color', usage_count: 25 }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await client.getStyleUsages(mockFileKey, {
        groupBy: 'style'
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Variable Analytics Methods', () => {
    test('should get variable actions', async () => {
      const mockResponse = {
        variable_actions: [
          { variable_name: 'Primary Token', action_count: 12 }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await client.getVariableActions(mockFileKey, {
        groupBy: 'variable'
      });

      expect(result).toEqual(mockResponse);
    });

    test('should get variable usages', async () => {
      const mockResponse = {
        variable_usages: [
          { variable_name: 'Primary Token', usage_count: 30 }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await client.getVariableUsages(mockFileKey, {
        groupBy: 'variable'
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Query Parameter Building', () => {
    test('should build query parameters correctly', () => {
      const params = client._buildQueryParams({
        groupBy: 'component',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        cursor: 'test-cursor'
      });

      expect(params.get('group_by')).toBe('component');
      expect(params.get('start_date')).toBe('2023-01-01');
      expect(params.get('end_date')).toBe('2023-12-31');
      expect(params.get('cursor')).toBe('test-cursor');
    });

    test('should handle empty options', () => {
      const params = client._buildQueryParams({});
      expect(params.toString()).toBe('');
    });
  });

  describe('Pagination Support', () => {
    test('should paginate through results', async () => {
      const page1Response = {
        component_actions: [{ component_name: 'Button', action_count: 5 }],
        pagination: { next_cursor: 'cursor2' }
      };

      const page2Response = {
        component_actions: [{ component_name: 'Input', action_count: 3 }],
        pagination: { next_cursor: null }
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValueOnce(page1Response)
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValueOnce(page2Response)
        });

      const pages = [];
      for await (const page of client.paginate(
        client.getComponentActions.bind(client),
        mockFileKey,
        { groupBy: 'component' }
      )) {
        pages.push(page);
      }

      expect(pages).toHaveLength(2);
      expect(pages[0]).toHaveLength(1);
      expect(pages[1]).toHaveLength(1);
    });

    test('should get all data via pagination', async () => {
      const page1Response = {
        component_actions: [{ component_name: 'Button', action_count: 5 }],
        pagination: { next_cursor: 'cursor2' }
      };

      const page2Response = {
        component_actions: [{ component_name: 'Input', action_count: 3 }],
        pagination: { next_cursor: null }
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValueOnce(page1Response)
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValueOnce(page2Response)
        });

      const allData = await client.getAll(
        client.getComponentActions.bind(client),
        mockFileKey,
        { groupBy: 'component' }
      );

      expect(allData).toHaveLength(2);
      expect(allData[0].component_name).toBe('Button');
      expect(allData[1].component_name).toBe('Input');
    });
  });

  describe('Utility Methods', () => {
    test('should get supported groupBy options', () => {
      const componentActionsOptions = client.getSupportedGroupByOptions('component', 'actions');
      expect(componentActionsOptions).toEqual(['component', 'team']);

      const styleUsagesOptions = client.getSupportedGroupByOptions('style', 'usages');
      expect(styleUsagesOptions).toEqual(['style', 'file']);
    });

    test('should handle unknown analytics type', () => {
      const unknownOptions = client.getSupportedGroupByOptions('unknown', 'actions');
      expect(unknownOptions).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    test('should retry on network errors', async () => {
      global.fetch
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValueOnce({ success: true })
        });

      const result = await client.request('/test-path');
      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('should not retry on auth errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValueOnce({})
      });

      await expect(client.request('/test-path')).rejects.toThrow(LibraryAnalyticsAuthError);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});