/**
 * Unit tests for FigmaCommentsService
 */

import { jest } from '@jest/globals';
import { FigmaCommentsService } from '../../src/core/service.mjs';
import { ValidationError, CommentError, NotFoundError } from '../../src/core/exceptions.mjs';

describe('FigmaCommentsService', () => {
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

  describe('Constructor', () => {
    test('should require client or apiToken', () => {
      expect(() => new FigmaCommentsService()).toThrow('fetcher parameter is required');
    });

    test('should initialize with client', () => {
      expect(service.fetcher).toBe(mockFetcher);
    });
  });

  describe('getFileComments', () => {
    test('should get comments successfully', async () => {
      const mockComments = [
        { id: '1', message: 'Test comment 1' },
        { id: '2', message: 'Test comment 2' }
      ];
      
      mockFetcher.request.mockResolvedValueOnce({ comments: mockComments });

      const result = await service.getFileComments('test-file-key');

      expect(mockFetcher.request).toHaveBeenCalledWith('/v1/files/test-file-key/comments', {
        params: {}
      });
      expect(result).toEqual(mockComments);
    });

    test('should request markdown format when specified', async () => {
      mockFetcher.request.mockResolvedValueOnce({ comments: [] });

      await service.getFileComments('test-file-key', { asMarkdown: true });

      expect(mockFetcher.request).toHaveBeenCalledWith('/v1/files/test-file-key/comments', {
        params: { as_md: true }
      });
    });

    test('should validate file key', async () => {
      await expect(service.getFileComments('')).rejects.toThrow(ValidationError);
      await expect(service.getFileComments(null)).rejects.toThrow(ValidationError);
    });
  });

  describe('addComment', () => {
    test('should add comment successfully', async () => {
      const mockComment = { id: 'new-comment', message: 'Test comment' };
      mockFetcher.request.mockResolvedValueOnce(mockComment);

      const result = await service.addComment('test-file-key', {
        message: 'Test comment'
      });

      expect(mockFetcher.request).toHaveBeenCalledWith('/v1/files/test-file-key/comments', {
        method: 'POST',
        body: { message: 'Test comment' }
      });
      expect(result).toEqual(mockComment);
    });

    test('should add comment with position', async () => {
      const mockComment = { id: 'new-comment', message: 'Test comment' };
      mockFetcher.request.mockResolvedValueOnce(mockComment);

      await service.addComment('test-file-key', {
        message: 'Test comment',
        position: { x: 100, y: 200 }
      });

      expect(mockFetcher.request).toHaveBeenCalledWith('/v1/files/test-file-key/comments', {
        method: 'POST',
        body: {
          message: 'Test comment',
          client_meta: { x: 100, y: 200 }
        }
      });
    });

    test('should add reply comment', async () => {
      const mockComment = { id: 'reply-comment', message: 'Reply' };
      mockFetcher.request.mockResolvedValueOnce(mockComment);

      await service.addComment('test-file-key', {
        message: 'Reply',
        parentId: 'parent-comment-id'
      });

      expect(mockFetcher.request).toHaveBeenCalledWith('/v1/files/test-file-key/comments', {
        method: 'POST',
        body: {
          message: 'Reply',
          comment_id: 'parent-comment-id'
        }
      });
    });

    test('should validate comment data', async () => {
      await expect(service.addComment('test-file-key', null))
        .rejects.toThrow('Comment data must be an object');
      
      await expect(service.addComment('test-file-key', {}))
        .rejects.toThrow('Comment message is required');
      
      await expect(service.addComment('test-file-key', { message: '' }))
        .rejects.toThrow('Comment message is required');
    });

    test('should validate message length', async () => {
      const longMessage = 'a'.repeat(8001);
      
      await expect(service.addComment('test-file-key', { message: longMessage }))
        .rejects.toThrow('Comment message too long');
    });
  });

  describe('deleteComment', () => {
    test('should delete comment successfully', async () => {
      const mockResult = { status: 200, error: false };
      mockFetcher.request.mockResolvedValueOnce(mockResult);

      const result = await service.deleteComment('test-file-key', 'comment-id');

      expect(mockFetcher.request).toHaveBeenCalledWith(
        '/v1/files/test-file-key/comments/comment-id',
        { method: 'DELETE' }
      );
      expect(result).toEqual(mockResult);
    });

    test('should validate parameters', async () => {
      await expect(service.deleteComment('', 'comment-id'))
        .rejects.toThrow(ValidationError);
      
      await expect(service.deleteComment('test-file-key', ''))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('getCommentThread', () => {
    test('should get comment thread successfully', async () => {
      const mockComments = [
        { id: 'root', message: 'Root comment', parent_id: null },
        { id: 'reply1', message: 'Reply 1', parent_id: 'root', created_at: '2023-01-01T10:00:00Z' },
        { id: 'reply2', message: 'Reply 2', parent_id: 'root', created_at: '2023-01-01T11:00:00Z' },
        { id: 'other', message: 'Other comment', parent_id: null }
      ];
      
      mockFetcher.request.mockResolvedValueOnce({ comments: mockComments });

      const result = await service.getCommentThread('test-file-key', 'root');

      expect(result.id).toBe('root');
      expect(result.replies).toHaveLength(2);
      expect(result.replies[0].id).toBe('reply1');
      expect(result.replies[1].id).toBe('reply2');
    });

    test('should throw error for non-existent comment', async () => {
      mockFetcher.request.mockResolvedValueOnce({ comments: [] });

      await expect(service.getCommentThread('test-file-key', 'non-existent'))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('searchComments', () => {
    test('should search comments by message content', async () => {
      const mockComments = [
        { id: '1', message: 'This is a test comment', user: { handle: 'user1' } },
        { id: '2', message: 'Another comment here', user: { handle: 'user2' } },
        { id: '3', message: 'Testing the search', user: { handle: 'user3' } }
      ];
      
      mockFetcher.request.mockResolvedValueOnce({ comments: mockComments });

      const result = await service.searchComments('test-file-key', 'test');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
    });

    test('should search comments including user names', async () => {
      const mockComments = [
        { id: '1', message: 'Regular comment', user: { handle: 'testuser' } },
        { id: '2', message: 'Another comment', user: { handle: 'user2' } }
      ];
      
      mockFetcher.request.mockResolvedValueOnce({ comments: mockComments });

      const result = await service.searchComments('test-file-key', 'test', { includeUsers: true });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('getCommentsByUser', () => {
    test('should filter comments by user', async () => {
      const mockComments = [
        { id: '1', message: 'Comment 1', user: { id: 'user1' }, created_at: '2023-01-01T10:00:00Z' },
        { id: '2', message: 'Comment 2', user: { id: 'user2' }, created_at: '2023-01-01T11:00:00Z' },
        { id: '3', message: 'Comment 3', user: { id: 'user1' }, created_at: '2023-01-01T12:00:00Z' }
      ];
      
      mockFetcher.request.mockResolvedValueOnce({ comments: mockComments });

      const result = await service.getCommentsByUser('test-file-key', 'user1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('3'); // Most recent first
      expect(result[1].id).toBe('1');
    });
  });

  describe('getUnresolvedComments', () => {
    test('should filter unresolved comments', async () => {
      const mockComments = [
        { id: '1', message: 'Unresolved 1', resolved_at: null },
        { id: '2', message: 'Resolved', resolved_at: '2023-01-01T10:00:00Z' },
        { id: '3', message: 'Unresolved 2', resolved_at: null }
      ];
      
      mockFetcher.request.mockResolvedValueOnce({ comments: mockComments });

      const result = await service.getUnresolvedComments('test-file-key');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
    });
  });

  describe('batchDeleteComments', () => {
    test('should delete multiple comments successfully', async () => {
      const commentIds = ['comment1', 'comment2', 'comment3'];
      mockFetcher.request
        .mockResolvedValueOnce({ status: 200 })
        .mockResolvedValueOnce({ status: 200 })
        .mockRejectedValueOnce(new Error('Delete failed'));

      const result = await service.batchDeleteComments('test-file-key', commentIds);

      expect(result.total).toBe(3);
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.successful).toEqual(['comment1', 'comment2']);
      expect(result.failed[0].commentId).toBe('comment3');
    });

    test('should validate input', async () => {
      await expect(service.batchDeleteComments('test-file-key', []))
        .rejects.toThrow('commentIds must be a non-empty array');
      
      await expect(service.batchDeleteComments('test-file-key', null))
        .rejects.toThrow('commentIds must be a non-empty array');
    });
  });

  describe('getCommentStatistics', () => {
    test('should calculate statistics correctly', async () => {
      const mockComments = [
        {
          id: 'root1',
          message: 'Root comment 1',
          parent_id: null,
          user: { id: 'user1' },
          created_at: '2023-01-01T10:00:00Z',
          resolved_at: null
        },
        {
          id: 'reply1',
          message: 'Reply to root1',
          parent_id: 'root1',
          user: { id: 'user2' },
          created_at: '2023-01-01T11:00:00Z',
          resolved_at: '2023-01-01T12:00:00Z'
        },
        {
          id: 'root2',
          message: 'Root comment 2',
          parent_id: null,
          user: { id: 'user1' },
          created_at: '2023-01-01T12:00:00Z',
          resolved_at: null
        }
      ];
      
      mockFetcher.request.mockResolvedValueOnce({ comments: mockComments });

      const stats = await service.getCommentStatistics('test-file-key');

      expect(stats.total).toBe(3);
      expect(stats.resolved).toBe(1);
      expect(stats.unresolved).toBe(2);
      expect(stats.totalReplies).toBe(1);
      expect(stats.rootComments).toBe(2);
      expect(stats.withReplies).toBe(1);
      expect(stats.uniqueUsers).toBe(2);
      expect(stats.oldestComment.id).toBe('root1');
      expect(stats.newestComment.id).toBe('root2');
    });
  });

  describe('exportComments', () => {
    const mockComments = [
      {
        id: 'comment1',
        message: 'Test comment',
        user: { handle: 'user1' },
        created_at: '2023-01-01T10:00:00Z',
        resolved_at: null,
        parent_id: null
      }
    ];

    beforeEach(() => {
      mockFetcher.request.mockResolvedValueOnce({ comments: mockComments });
    });

    test('should export as JSON', async () => {
      const result = await service.exportComments('test-file-key', 'json');
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(mockComments);
    });

    test('should export as CSV', async () => {
      const result = await service.exportComments('test-file-key', 'csv');
      expect(result).toContain('ID,Message,User,Created At,Resolved At,Parent ID');
      expect(result).toContain('comment1,"Test comment",user1');
    });

    test('should export as Markdown', async () => {
      const result = await service.exportComments('test-file-key', 'markdown');
      expect(result).toContain('# Figma Comments Export');
      expect(result).toContain('## Comment by user1');
      expect(result).toContain('Test comment');
    });

    test('should throw error for unsupported format', async () => {
      await expect(service.exportComments('test-file-key', 'xml'))
        .rejects.toThrow('Unsupported export format: xml');
    });
  });

  describe('bulkAddComments', () => {
    test('should add multiple comments successfully', async () => {
      const comments = [
        { message: 'Comment 1' },
        { message: 'Comment 2' },
        { message: 'Comment 3' }
      ];
      
      mockFetcher.request
        .mockResolvedValueOnce({ id: 'comment1' })
        .mockResolvedValueOnce({ id: 'comment2' })
        .mockRejectedValueOnce(new Error('Add failed'));

      const result = await service.bulkAddComments('test-file-key', comments);

      expect(result.total).toBe(3);
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
    });

    test('should validate input', async () => {
      await expect(service.bulkAddComments('test-file-key', []))
        .rejects.toThrow('comments must be a non-empty array');
    });
  });

  describe('getCommentHistory', () => {
    test('should filter comments by date range', async () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const mockComments = [
        { id: '1', message: 'Recent', created_at: threeDaysAgo.toISOString() },
        { id: '2', message: 'Old', created_at: tenDaysAgo.toISOString() },
        { id: '3', message: 'Very recent', created_at: now.toISOString() }
      ];
      
      mockFetcher.request.mockResolvedValueOnce({ comments: mockComments });

      const result = await service.getCommentHistory('test-file-key', 7);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('3'); // Most recent first
      expect(result[1].id).toBe('1');
    });
  });
});