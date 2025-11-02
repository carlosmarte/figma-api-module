/**
 * Unit tests for Figma Comments Reaction functionality
 */

import { jest } from '@jest/globals';
import { FigmaCommentsService } from '../../src/core/service.mjs';
import { FigmaCommentsSDK } from '../../src/interfaces/sdk.mjs';
import { 
  ValidationError, 
  CommentError, 
  AuthorizationError,
  NotFoundError 
} from '../../src/core/exceptions.mjs';

describe('FigmaCommentsService - Reactions', () => {
  let service;
  let mockFetcher;

  beforeEach(() => {
    mockFetcher = {
      request: jest.fn()
    };
    
    service = new FigmaCommentsService({ 
      fetcher: mockFetcher,
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }
    });
  });

  describe('getCommentReactions', () => {
    test('should get reactions for a comment successfully', async () => {
      const mockReactions = {
        reactions: [
          { emoji: '👍', user: { id: 'user1', handle: 'user1' } },
          { emoji: '❤️', user: { id: 'user2', handle: 'user2' } }
        ]
      };
      
      mockFetcher.request.mockResolvedValueOnce(mockReactions);

      const result = await service.getCommentReactions('test-file-key', 'comment-id');

      expect(mockFetcher.request).toHaveBeenCalledWith(
        '/v1/files/test-file-key/comments/comment-id/reactions'
      );
      expect(result).toEqual(mockReactions);
    });

    test('should validate parameters', async () => {
      await expect(service.getCommentReactions('', 'comment-id'))
        .rejects.toThrow(ValidationError);
      
      await expect(service.getCommentReactions('test-file-key', ''))
        .rejects.toThrow(ValidationError);
    });

    test('should handle 403 error with proper scope message', async () => {
      const error403 = new Error('Forbidden');
      error403.status = 403;
      mockFetcher.request.mockRejectedValueOnce(error403);

      await expect(service.getCommentReactions('test-file-key', 'comment-id'))
        .rejects.toThrow(AuthorizationError);
    });

    test('should handle general errors', async () => {
      mockFetcher.request.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getCommentReactions('test-file-key', 'comment-id'))
        .rejects.toThrow(CommentError);
    });
  });

  describe('addCommentReaction', () => {
    test('should add reaction to comment successfully', async () => {
      const mockReaction = {
        emoji: '👍',
        user: { id: 'user1', handle: 'user1' },
        created_at: '2023-01-01T10:00:00Z'
      };
      
      mockFetcher.request.mockResolvedValueOnce(mockReaction);

      const result = await service.addCommentReaction('test-file-key', 'comment-id', '👍');

      expect(mockFetcher.request).toHaveBeenCalledWith(
        '/v1/files/test-file-key/comments/comment-id/reactions',
        {
          method: 'POST',
          body: { emoji: '👍' }
        }
      );
      expect(result).toEqual(mockReaction);
    });

    test('should validate emoji parameter', async () => {
      await expect(service.addCommentReaction('test-file-key', 'comment-id', ''))
        .rejects.toThrow(ValidationError);
      
      await expect(service.addCommentReaction('test-file-key', 'comment-id', null))
        .rejects.toThrow(ValidationError);
    });

    test('should validate emoji length', async () => {
      const longEmoji = 'a'.repeat(11);
      
      await expect(service.addCommentReaction('test-file-key', 'comment-id', longEmoji))
        .rejects.toThrow(ValidationError);
    });

    test('should handle 403 error for write permission', async () => {
      const error403 = new Error('Forbidden');
      error403.status = 403;
      mockFetcher.request.mockRejectedValueOnce(error403);

      await expect(service.addCommentReaction('test-file-key', 'comment-id', '👍'))
        .rejects.toThrow(AuthorizationError);
    });
  });

  describe('deleteCommentReaction', () => {
    test('should delete reaction from comment successfully', async () => {
      const mockResult = { success: true };
      
      mockFetcher.request.mockResolvedValueOnce(mockResult);

      const result = await service.deleteCommentReaction('test-file-key', 'comment-id', '👍');

      expect(mockFetcher.request).toHaveBeenCalledWith(
        '/v1/files/test-file-key/comments/comment-id/reactions',
        {
          method: 'DELETE',
          body: { emoji: '👍' }
        }
      );
      expect(result).toEqual(mockResult);
    });

    test('should handle 403 error for write permission', async () => {
      const error403 = new Error('Forbidden');
      error403.status = 403;
      mockFetcher.request.mockRejectedValueOnce(error403);

      await expect(service.deleteCommentReaction('test-file-key', 'comment-id', '👍'))
        .rejects.toThrow(AuthorizationError);
    });
  });

  describe('toggleCommentReaction', () => {
    test('should add reaction when not present', async () => {
      const mockReactions = { reactions: [] };
      const mockUserInfo = { id: 'current-user' };
      const mockNewReaction = { emoji: '👍', user: { id: 'current-user' } };
      
      mockFetcher.request
        .mockResolvedValueOnce(mockReactions) // getCommentReactions
        .mockResolvedValueOnce(mockUserInfo) // getCurrentUserId
        .mockResolvedValueOnce(mockNewReaction); // addCommentReaction

      const result = await service.toggleCommentReaction('test-file-key', 'comment-id', '👍');

      expect(result.action).toBe('added');
      expect(result.emoji).toBe('👍');
      expect(result.commentId).toBe('comment-id');
    });

    test('should remove reaction when already present', async () => {
      const mockReactions = { 
        reactions: [{ emoji: '👍', user: { id: 'current-user' } }] 
      };
      const mockUserInfo = { id: 'current-user' };
      const mockDeleteResult = { success: true };
      
      mockFetcher.request
        .mockResolvedValueOnce(mockReactions) // getCommentReactions
        .mockResolvedValueOnce(mockUserInfo) // getCurrentUserId
        .mockResolvedValueOnce(mockDeleteResult); // deleteCommentReaction

      const result = await service.toggleCommentReaction('test-file-key', 'comment-id', '👍');

      expect(result.action).toBe('removed');
      expect(result.emoji).toBe('👍');
      expect(result.commentId).toBe('comment-id');
    });
  });

  describe('getFileReactionSummary', () => {
    test('should calculate reaction summary correctly', async () => {
      const mockComments = [
        { id: 'comment1', message: 'Test 1' },
        { id: 'comment2', message: 'Test 2' }
      ];
      
      const mockReactions1 = {
        reactions: [
          { emoji: '👍', user: { id: 'user1', handle: 'user1' } },
          { emoji: '❤️', user: { id: 'user1', handle: 'user1' } }
        ]
      };
      
      const mockReactions2 = {
        reactions: [
          { emoji: '👍', user: { id: 'user2', handle: 'user2' } }
        ]
      };
      
      mockFetcher.request
        .mockResolvedValueOnce({ comments: mockComments }) // getFileComments
        .mockResolvedValueOnce(mockReactions1) // getCommentReactions for comment1
        .mockResolvedValueOnce(mockReactions2); // getCommentReactions for comment2

      const summary = await service.getFileReactionSummary('test-file-key');

      expect(summary.totalReactions).toBe(3);
      expect(summary.emojiCounts['👍']).toBe(2);
      expect(summary.emojiCounts['❤️']).toBe(1);
      expect(summary.topEmojis).toHaveLength(2);
      expect(summary.topEmojis[0]).toEqual({ emoji: '👍', count: 2 });
    });

    test('should handle individual comment reaction failures gracefully', async () => {
      const mockComments = [
        { id: 'comment1', message: 'Test 1' },
        { id: 'comment2', message: 'Test 2' }
      ];
      
      mockFetcher.request
        .mockResolvedValueOnce({ comments: mockComments }) // getFileComments
        .mockRejectedValueOnce(new Error('Failed to get reactions')) // comment1 fails
        .mockResolvedValueOnce({ reactions: [] }); // comment2 succeeds

      const summary = await service.getFileReactionSummary('test-file-key');

      expect(summary.totalReactions).toBe(0);
      expect(summary.topEmojis).toHaveLength(0);
    });
  });
});

describe('FigmaCommentsSDK - Reactions', () => {
  let sdk;
  let mockService;
  let mockFetcher;

  beforeEach(() => {
    mockFetcher = {
      request: jest.fn()
    };

    mockService = {
      getCommentReactions: jest.fn(),
      addCommentReaction: jest.fn(),
      deleteCommentReaction: jest.fn(),
      toggleCommentReaction: jest.fn(),
      getFileReactionSummary: jest.fn()
    };

    // Create SDK with mocked fetcher
    sdk = new FigmaCommentsSDK({ fetcher: mockFetcher });
    sdk.service = mockService;
  });

  describe('getCommentReactions', () => {
    test('should call service method', async () => {
      const mockReactions = { reactions: [] };
      mockService.getCommentReactions.mockResolvedValueOnce(mockReactions);

      const result = await sdk.getCommentReactions('file-key', 'comment-id');

      expect(mockService.getCommentReactions).toHaveBeenCalledWith('file-key', 'comment-id');
      expect(result).toEqual(mockReactions);
    });
  });

  describe('addReaction', () => {
    test('should call service method', async () => {
      const mockReaction = { emoji: '👍' };
      mockService.addCommentReaction.mockResolvedValueOnce(mockReaction);

      const result = await sdk.addReaction('file-key', 'comment-id', '👍');

      expect(mockService.addCommentReaction).toHaveBeenCalledWith('file-key', 'comment-id', '👍');
      expect(result).toEqual(mockReaction);
    });
  });

  describe('removeReaction', () => {
    test('should call service method', async () => {
      const mockResult = { success: true };
      mockService.deleteCommentReaction.mockResolvedValueOnce(mockResult);

      const result = await sdk.removeReaction('file-key', 'comment-id', '👍');

      expect(mockService.deleteCommentReaction).toHaveBeenCalledWith('file-key', 'comment-id', '👍');
      expect(result).toEqual(mockResult);
    });
  });

  describe('toggleReaction', () => {
    test('should call service method', async () => {
      const mockToggleResult = { action: 'added', emoji: '👍' };
      mockService.toggleCommentReaction.mockResolvedValueOnce(mockToggleResult);

      const result = await sdk.toggleReaction('file-key', 'comment-id', '👍');

      expect(mockService.toggleCommentReaction).toHaveBeenCalledWith('file-key', 'comment-id', '👍');
      expect(result).toEqual(mockToggleResult);
    });
  });

  describe('quickReact', () => {
    test('should convert reaction type to emoji', async () => {
      const mockReaction = { emoji: '👍' };
      mockService.addCommentReaction.mockResolvedValueOnce(mockReaction);

      const result = await sdk.quickReact('file-key', 'comment-id', 'like');

      expect(mockService.addCommentReaction).toHaveBeenCalledWith('file-key', 'comment-id', '👍');
      expect(result).toEqual(mockReaction);
    });

    test('should throw error for unknown reaction type', async () => {
      await expect(sdk.quickReact('file-key', 'comment-id', 'unknown'))
        .rejects.toThrow('Unsupported reaction type: unknown');
    });
  });

  describe('getReactionSummary', () => {
    test('should call service method with options', async () => {
      const mockSummary = { totalReactions: 10 };
      mockService.getFileReactionSummary.mockResolvedValueOnce(mockSummary);

      const result = await sdk.getReactionSummary('file-key', { topCount: 5 });

      expect(mockService.getFileReactionSummary).toHaveBeenCalledWith('file-key', { topCount: 5 });
      expect(result).toEqual(mockSummary);
    });
  });

  describe('getTopReactions', () => {
    test('should return top emojis from summary', async () => {
      const mockSummary = {
        topEmojis: [
          { emoji: '👍', count: 10 },
          { emoji: '❤️', count: 5 }
        ]
      };
      mockService.getFileReactionSummary.mockResolvedValueOnce(mockSummary);

      const result = await sdk.getTopReactions('file-key', 2);

      expect(result).toEqual(mockSummary.topEmojis);
    });
  });

  describe('getMostReactedComments', () => {
    test('should return most reacted comments from summary', async () => {
      const mockSummary = {
        mostReactedComments: [
          { commentId: 'comment1', count: 5 },
          { commentId: 'comment2', count: 3 }
        ]
      };
      mockService.getFileReactionSummary.mockResolvedValueOnce(mockSummary);

      const result = await sdk.getMostReactedComments('file-key', 2);

      expect(result).toEqual(mockSummary.mostReactedComments);
    });
  });

  describe('getEngagementMetrics', () => {
    test('should include reaction metrics in engagement data', async () => {
      const mockComments = [{ id: 'comment1' }];
      const mockStats = { total: 1, totalReplies: 0 };
      const mockReactionSummary = { totalReactions: 5, topEmojis: [] };

      // Mock the service methods
      sdk.service.getFileComments = jest.fn().mockResolvedValueOnce(mockComments);
      sdk.service.getCommentStatistics = jest.fn().mockResolvedValueOnce(mockStats);
      mockService.getFileReactionSummary.mockResolvedValueOnce(mockReactionSummary);

      const result = await sdk.getEngagementMetrics('file-key');

      expect(result.totalReactions).toBe(5);
      expect(result.reactionRate).toBe(500); // 5 reactions / 1 comment * 100
      expect(result.avgReactionsPerComment).toBe(5);
    });
  });
});

describe('Reaction Validation', () => {
  let service;
  let mockFetcher;

  beforeEach(() => {
    mockFetcher = { request: jest.fn() };
    service = new FigmaCommentsService({ fetcher: mockFetcher });
  });

  describe('_validateReactionEmoji', () => {
    test('should accept valid emoji', () => {
      expect(() => service._validateReactionEmoji('👍')).not.toThrow();
      expect(() => service._validateReactionEmoji('❤️')).not.toThrow();
      expect(() => service._validateReactionEmoji('😂')).not.toThrow();
    });

    test('should reject invalid emoji formats', () => {
      expect(() => service._validateReactionEmoji('')).toThrow(ValidationError);
      expect(() => service._validateReactionEmoji(null)).toThrow(ValidationError);
      expect(() => service._validateReactionEmoji(undefined)).toThrow(ValidationError);
      expect(() => service._validateReactionEmoji('a'.repeat(11))).toThrow(ValidationError);
    });
  });

  describe('Scope validation error messages', () => {
    test('should provide clear read scope error message', async () => {
      const error403 = new Error('Forbidden');
      error403.status = 403;
      mockFetcher.request.mockRejectedValueOnce(error403);

      try {
        await service.getCommentReactions('file-key', 'comment-id');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthorizationError);
        expect(error.message).toContain('file_comments:read');
        expect(error.message).toContain('files:read');
        expect(error.meta.requiredScopes).toEqual(['file_comments:read', 'files:read']);
      }
    });

    test('should provide clear write scope error message', async () => {
      const error403 = new Error('Forbidden');
      error403.status = 403;
      mockFetcher.request.mockRejectedValueOnce(error403);

      try {
        await service.addCommentReaction('file-key', 'comment-id', '👍');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthorizationError);
        expect(error.message).toContain('file_comments:write');
        expect(error.meta.requiredScopes).toEqual(['file_comments:write']);
      }
    });
  });
});