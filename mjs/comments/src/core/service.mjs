/**
 * project: figma-comments
 * purpose: Business logic layer for Figma Comments operations
 * use-cases:
 *  - Comment CRUD operations with validation
 *  - Comment threading and reply management
 *  - Comment search and filtering capabilities
 *  - Bulk operations and comment analytics
 *  - Comment reaction management (add, delete, get)
 * performance:
 *  - Efficient comment filtering and sorting
 *  - Paginated data processing
 *  - Optimized search algorithms
 *  - Memory-efficient bulk operations
 */

import {
  ValidationError,
  CommentError,
  CommentValidationError,
  FileError,
  NotFoundError,
  AuthorizationError
} from './exceptions.mjs';

/**
 * Core service for Figma Comments business logic
 */
export class FigmaCommentsService {
  /**
   * @param {Object} options - Service configuration
   * @param {Object} options.fetcher - FigmaApiClient instance (required)
   * @param {Object} [options.logger=console] - Logger instance
   * @param {boolean} [options.validateInputs=true] - Whether to validate inputs
   */
  constructor({
    fetcher,
    logger = console,
    validateInputs = true
  } = {}) {
    if (!fetcher) {
      throw new Error('fetcher parameter is required. Please create and pass a FigmaApiClient instance.');
    }

    this.fetcher = fetcher;
    this.logger = logger;
    this.validateInputs = validateInputs;
  }

  /**
   * Get all comments in a file
   * @param {string} fileKey - Figma file key
   * @param {Object} options - Request options
   * @returns {Promise<Array>} Array of comments
   */
  async getFileComments(fileKey, options = {}) {
    this._validateFileKey(fileKey);
    
    const params = {};
    if (options.asMarkdown) {
      params.as_md = true;
    }

    try {
      const response = await this.fetcher.request(`/v1/files/${fileKey}/comments`, {
        params
      });

      const comments = response.comments || [];
      this.logger.debug(`Retrieved ${comments.length} comments for file ${fileKey}`);
      
      return comments;
    } catch (error) {
      throw new FileError(`Failed to get comments for file: ${error.message}`, fileKey);
    }
  }

  /**
   * Add a new comment to a file
   * @param {string} fileKey - Figma file key
   * @param {Object} commentData - Comment data
   * @returns {Promise<Object>} Created comment
   */
  async addComment(fileKey, commentData) {
    this._validateFileKey(fileKey);
    this._validateCommentData(commentData);

    const payload = {
      message: commentData.message
    };

    // Add positioning information if provided
    if (commentData.position) {
      payload.client_meta = this._formatPosition(commentData.position);
    }

    // Add reply information if this is a reply
    if (commentData.parentId) {
      payload.comment_id = commentData.parentId;
    }

    try {
      const comment = await this.fetcher.request(`/v1/files/${fileKey}/comments`, {
        method: 'POST',
        body: payload
      });

      this.logger.debug(`Created comment ${comment.id} in file ${fileKey}`);
      return comment;
    } catch (error) {
      throw new CommentError(`Failed to add comment: ${error.message}`);
    }
  }

  /**
   * Delete a comment
   * @param {string} fileKey - Figma file key
   * @param {string} commentId - Comment ID to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteComment(fileKey, commentId) {
    this._validateFileKey(fileKey);
    this._validateCommentId(commentId);

    try {
      const result = await this.fetcher.request(
        `/v1/files/${fileKey}/comments/${commentId}`,
        { method: 'DELETE' }
      );

      this.logger.debug(`Deleted comment ${commentId} from file ${fileKey}`);
      return result;
    } catch (error) {
      throw new CommentError(`Failed to delete comment: ${error.message}`, commentId);
    }
  }

  // === REACTION METHODS ===

  /**
   * Get reactions for a comment
   * Requires 'file_comments:read' and 'files:read' scopes
   * @param {string} fileKey - Figma file key
   * @param {string} commentId - Comment ID
   * @returns {Promise<Object>} Comment reactions
   */
  async getCommentReactions(fileKey, commentId) {
    this._validateFileKey(fileKey);
    this._validateCommentId(commentId);

    try {
      const response = await this.fetcher.request(
        `/v1/files/${fileKey}/comments/${commentId}/reactions`
      );

      this.logger.debug(`Retrieved reactions for comment ${commentId} in file ${fileKey}`);
      return response;
    } catch (error) {
      if (error.status === 403) {
        throw new AuthorizationError(
          'Insufficient permissions to read comment reactions. Required scopes: file_comments:read, files:read',
          { fileKey, commentId, requiredScopes: ['file_comments:read', 'files:read'] }
        );
      }
      throw new CommentError(`Failed to get comment reactions: ${error.message}`, commentId);
    }
  }

  /**
   * Add a reaction to a comment
   * Requires 'file_comments:write' scope
   * @param {string} fileKey - Figma file key
   * @param {string} commentId - Comment ID
   * @param {string} emoji - Reaction emoji (e.g., '👍', '❤️', '😀')
   * @returns {Promise<Object>} Added reaction
   */
  async addCommentReaction(fileKey, commentId, emoji) {
    this._validateFileKey(fileKey);
    this._validateCommentId(commentId);
    this._validateReactionEmoji(emoji);

    const payload = { emoji };

    try {
      const reaction = await this.fetcher.request(
        `/v1/files/${fileKey}/comments/${commentId}/reactions`,
        {
          method: 'POST',
          body: payload
        }
      );

      this.logger.debug(`Added reaction "${emoji}" to comment ${commentId} in file ${fileKey}`);
      return reaction;
    } catch (error) {
      if (error.status === 403) {
        throw new AuthorizationError(
          'Insufficient permissions to add comment reactions. Required scope: file_comments:write',
          { fileKey, commentId, requiredScopes: ['file_comments:write'] }
        );
      }
      throw new CommentError(`Failed to add reaction: ${error.message}`, commentId);
    }
  }

  /**
   * Delete a reaction from a comment
   * Requires 'file_comments:write' scope
   * @param {string} fileKey - Figma file key
   * @param {string} commentId - Comment ID
   * @param {string} emoji - Reaction emoji to remove
   * @returns {Promise<Object>} Deletion result
   */
  async deleteCommentReaction(fileKey, commentId, emoji) {
    this._validateFileKey(fileKey);
    this._validateCommentId(commentId);
    this._validateReactionEmoji(emoji);

    try {
      const result = await this.fetcher.request(
        `/v1/files/${fileKey}/comments/${commentId}/reactions`,
        {
          method: 'DELETE',
          body: { emoji }
        }
      );

      this.logger.debug(`Deleted reaction "${emoji}" from comment ${commentId} in file ${fileKey}`);
      return result;
    } catch (error) {
      if (error.status === 403) {
        throw new AuthorizationError(
          'Insufficient permissions to delete comment reactions. Required scope: file_comments:write',
          { fileKey, commentId, requiredScopes: ['file_comments:write'] }
        );
      }
      throw new CommentError(`Failed to delete reaction: ${error.message}`, commentId);
    }
  }

  /**
   * Toggle a reaction on a comment (add if not present, remove if present)
   * @param {string} fileKey - Figma file key
   * @param {string} commentId - Comment ID
   * @param {string} emoji - Reaction emoji
   * @returns {Promise<Object>} Result with action taken (added/removed)
   */
  async toggleCommentReaction(fileKey, commentId, emoji) {
    this._validateFileKey(fileKey);
    this._validateCommentId(commentId);
    this._validateReactionEmoji(emoji);

    try {
      // First, get current reactions to check if this emoji already exists
      const reactions = await this.getCommentReactions(fileKey, commentId);
      const currentUserId = await this._getCurrentUserId(); // Helper method to get current user
      
      // Check if current user has already reacted with this emoji
      const existingReaction = reactions.reactions?.find(r => 
        r.emoji === emoji && r.user.id === currentUserId
      );

      if (existingReaction) {
        // Remove the reaction
        await this.deleteCommentReaction(fileKey, commentId, emoji);
        return {
          action: 'removed',
          emoji,
          commentId,
          message: `Removed reaction "${emoji}" from comment ${commentId}`
        };
      } else {
        // Add the reaction
        const reaction = await this.addCommentReaction(fileKey, commentId, emoji);
        return {
          action: 'added',
          emoji,
          commentId,
          reaction,
          message: `Added reaction "${emoji}" to comment ${commentId}`
        };
      }
    } catch (error) {
      throw new CommentError(`Failed to toggle reaction: ${error.message}`, commentId);
    }
  }

  /**
   * Get all reactions across all comments in a file
   * @param {string} fileKey - Figma file key
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Aggregated reaction data
   */
  async getFileReactionSummary(fileKey, options = {}) {
    this._validateFileKey(fileKey);

    try {
      const comments = await this.getFileComments(fileKey);
      const reactionSummary = {
        totalReactions: 0,
        emojiCounts: {},
        topEmojis: [],
        commentReactionCounts: {},
        mostReactedComments: [],
        userReactionActivity: {}
      };

      // Process each comment to get reactions
      for (const comment of comments) {
        try {
          const reactions = await this.getCommentReactions(fileKey, comment.id);
          if (reactions.reactions && reactions.reactions.length > 0) {
            reactionSummary.commentReactionCounts[comment.id] = reactions.reactions.length;
            
            for (const reaction of reactions.reactions) {
              reactionSummary.totalReactions++;
              reactionSummary.emojiCounts[reaction.emoji] = 
                (reactionSummary.emojiCounts[reaction.emoji] || 0) + 1;
              
              // Track user activity
              const userId = reaction.user.id;
              if (!reactionSummary.userReactionActivity[userId]) {
                reactionSummary.userReactionActivity[userId] = {
                  user: reaction.user,
                  reactionCount: 0,
                  emojisUsed: new Set()
                };
              }
              reactionSummary.userReactionActivity[userId].reactionCount++;
              reactionSummary.userReactionActivity[userId].emojisUsed.add(reaction.emoji);
            }
          }
        } catch (error) {
          // Log but don't fail entire operation if individual comment reaction fetch fails
          this.logger.warn(`Failed to get reactions for comment ${comment.id}: ${error.message}`);
        }
      }

      // Calculate top emojis
      reactionSummary.topEmojis = Object.entries(reactionSummary.emojiCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, options.topCount || 10)
        .map(([emoji, count]) => ({ emoji, count }));

      // Find most reacted comments
      reactionSummary.mostReactedComments = Object.entries(reactionSummary.commentReactionCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, options.topCount || 10)
        .map(([commentId, count]) => {
          const comment = comments.find(c => c.id === commentId);
          return { commentId, count, comment: comment ? {
            message: comment.message.substring(0, 100),
            user: comment.user?.handle || 'Unknown',
            created_at: comment.created_at
          } : null };
        });

      // Convert user activity Sets to arrays
      Object.values(reactionSummary.userReactionActivity).forEach(activity => {
        activity.emojisUsed = Array.from(activity.emojisUsed);
      });

      return reactionSummary;
    } catch (error) {
      throw new FileError(`Failed to get reaction summary: ${error.message}`, fileKey);
    }
  }

  // === EXISTING METHODS CONTINUE ===

  /**
   * Get a comment with its replies (thread)
   * @param {string} fileKey - Figma file key  
   * @param {string} commentId - Root comment ID
   * @returns {Promise<Object>} Comment thread
   */
  async getCommentThread(fileKey, commentId) {
    const comments = await this.getFileComments(fileKey);
    const rootComment = comments.find(c => c.id === commentId);
    
    if (!rootComment) {
      throw new NotFoundError('Comment', commentId);
    }

    const replies = comments.filter(c => c.parent_id === commentId);
    
    return {
      ...rootComment,
      replies: replies.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    };
  }

  /**
   * Reply to an existing comment
   * @param {string} fileKey - Figma file key
   * @param {string} parentId - Parent comment ID
   * @param {string} message - Reply message
   * @returns {Promise<Object>} Created reply
   */
  async replyToComment(fileKey, parentId, message) {
    return this.addComment(fileKey, { message, parentId });
  }

  /**
   * Search comments by content
   * @param {string} fileKey - Figma file key
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Matching comments
   */
  async searchComments(fileKey, query, options = {}) {
    const comments = await this.getFileComments(fileKey);
    const lowerQuery = query.toLowerCase();
    
    const matches = comments.filter(comment => {
      const messageMatch = comment.message.toLowerCase().includes(lowerQuery);
      const userMatch = options.includeUsers && 
        comment.user.handle.toLowerCase().includes(lowerQuery);
      
      return messageMatch || userMatch;
    });

    // Sort by relevance (exact matches first, then by date)
    return matches.sort((a, b) => {
      const aExact = a.message.toLowerCase().includes(lowerQuery);
      const bExact = b.message.toLowerCase().includes(lowerQuery);
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }

  /**
   * Get comments by a specific user
   * @param {string} fileKey - Figma file key
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User's comments
   */
  async getCommentsByUser(fileKey, userId) {
    const comments = await this.getFileComments(fileKey);
    return comments
      .filter(c => c.user.id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  /**
   * Get unresolved comments
   * @param {string} fileKey - Figma file key
   * @returns {Promise<Array>} Unresolved comments
   */
  async getUnresolvedComments(fileKey) {
    const comments = await this.getFileComments(fileKey);
    return comments
      .filter(c => !c.resolved_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  /**
   * Mark a comment as resolved (simulated - Figma API doesn't have this endpoint)
   * @param {string} fileKey - Figma file key
   * @param {string} commentId - Comment ID
   * @returns {Promise<Object>} Updated comment info
   */
  async resolveComment(fileKey, commentId) {
    // Note: Figma API doesn't have a resolve endpoint
    // This would typically be implemented as a comment with special metadata
    this.logger.warn('Comment resolution not supported by Figma API');
    return { commentId, resolved: true, note: 'Simulated resolution' };
  }

  /**
   * Delete multiple comments in batch
   * @param {string} fileKey - Figma file key
   * @param {Array<string>} commentIds - Array of comment IDs
   * @returns {Promise<Object>} Batch deletion results
   */
  async batchDeleteComments(fileKey, commentIds) {
    this._validateFileKey(fileKey);
    
    if (!Array.isArray(commentIds) || commentIds.length === 0) {
      throw new ValidationError('commentIds must be a non-empty array');
    }

    const results = {
      successful: [],
      failed: [],
      total: commentIds.length
    };

    for (const commentId of commentIds) {
      try {
        await this.deleteComment(fileKey, commentId);
        results.successful.push(commentId);
      } catch (error) {
        results.failed.push({ commentId, error: error.message });
      }
    }

    this.logger.info(`Batch delete completed: ${results.successful.length}/${results.total} successful`);
    return results;
  }

  /**
   * Get comment statistics for a file
   * @param {string} fileKey - Figma file key
   * @returns {Promise<Object>} Comment statistics
   */
  async getCommentStatistics(fileKey) {
    const comments = await this.getFileComments(fileKey);
    
    const stats = {
      total: comments.length,
      resolved: comments.filter(c => c.resolved_at).length,
      unresolved: comments.filter(c => !c.resolved_at).length,
      withReplies: 0,
      totalReplies: 0,
      uniqueUsers: new Set(),
      oldestComment: null,
      newestComment: null,
      averageLength: 0
    };

    let totalLength = 0;
    const rootComments = comments.filter(c => !c.parent_id);
    
    for (const comment of comments) {
      stats.uniqueUsers.add(comment.user.id);
      totalLength += comment.message.length;
      
      const createdAt = new Date(comment.created_at);
      if (!stats.oldestComment || createdAt < new Date(stats.oldestComment.created_at)) {
        stats.oldestComment = comment;
      }
      if (!stats.newestComment || createdAt > new Date(stats.newestComment.created_at)) {
        stats.newestComment = comment;
      }

      if (comment.parent_id) {
        stats.totalReplies++;
      }
    }

    // Count root comments with replies
    for (const rootComment of rootComments) {
      const hasReplies = comments.some(c => c.parent_id === rootComment.id);
      if (hasReplies) {
        stats.withReplies++;
      }
    }

    stats.uniqueUsers = stats.uniqueUsers.size;
    stats.averageLength = comments.length > 0 ? Math.round(totalLength / comments.length) : 0;
    stats.rootComments = rootComments.length;

    return stats;
  }

  /**
   * Export comments in various formats
   * @param {string} fileKey - Figma file key
   * @param {string} format - Export format (json, csv, markdown)
   * @returns {Promise<string>} Exported data
   */
  async exportComments(fileKey, format = 'json') {
    const comments = await this.getFileComments(fileKey);
    
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(comments, null, 2);
        
      case 'csv':
        return this._exportToCsv(comments);
        
      case 'markdown':
      case 'md':
        return this._exportToMarkdown(comments);
        
      default:
        throw new ValidationError(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Add multiple comments at once
   * @param {string} fileKey - Figma file key
   * @param {Array<Object>} comments - Array of comment data
   * @returns {Promise<Object>} Bulk creation results
   */
  async bulkAddComments(fileKey, comments) {
    this._validateFileKey(fileKey);
    
    if (!Array.isArray(comments) || comments.length === 0) {
      throw new ValidationError('comments must be a non-empty array');
    }

    const results = {
      successful: [],
      failed: [],
      total: comments.length
    };

    for (const [index, commentData] of comments.entries()) {
      try {
        const comment = await this.addComment(fileKey, commentData);
        results.successful.push({ index, comment });
      } catch (error) {
        results.failed.push({ index, error: error.message, data: commentData });
      }
    }

    this.logger.info(`Bulk add completed: ${results.successful.length}/${results.total} successful`);
    return results;
  }

  /**
   * Get comments from the last N days
   * @param {string} fileKey - Figma file key
   * @param {number} days - Number of days to look back
   * @returns {Promise<Array>} Recent comments
   */
  async getCommentHistory(fileKey, days = 7) {
    const comments = await this.getFileComments(fileKey);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return comments
      .filter(c => new Date(c.created_at) >= cutoff)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  /**
   * Archive resolved comments (simulated)
   * @param {string} fileKey - Figma file key
   * @returns {Promise<Object>} Archive results
   */
  async archiveResolvedComments(fileKey) {
    // Note: This is simulated since Figma API doesn't support archiving
    const comments = await this.getFileComments(fileKey);
    const resolvedComments = comments.filter(c => c.resolved_at);
    
    this.logger.warn('Comment archiving not supported by Figma API');
    return {
      archived: resolvedComments.length,
      note: 'Simulated archiving - comments were not actually archived'
    };
  }

  // Private validation methods

  _validateFileKey(fileKey) {
    if (!fileKey || typeof fileKey !== 'string') {
      throw new ValidationError('fileKey must be a non-empty string', 'fileKey', fileKey);
    }
  }

  _validateCommentId(commentId) {
    if (!commentId || typeof commentId !== 'string') {
      throw new ValidationError('commentId must be a non-empty string', 'commentId', commentId);
    }
  }

  _validateReactionEmoji(emoji) {
    if (!emoji || typeof emoji !== 'string') {
      throw new ValidationError('emoji must be a non-empty string', 'emoji', emoji);
    }

    // Basic validation for emoji format
    if (emoji.length < 1 || emoji.length > 10) {
      throw new ValidationError('emoji must be between 1 and 10 characters', 'emoji', emoji);
    }
  }

  _validateCommentData(data) {
    if (!data || typeof data !== 'object') {
      throw new CommentValidationError('Comment data must be an object');
    }

    if (!data.message || typeof data.message !== 'string') {
      throw new CommentValidationError('Comment message is required and must be a string', 'message');
    }

    if (data.message.length > 8000) {
      throw new CommentValidationError('Comment message too long (max 8000 characters)', 'message');
    }
  }

  _formatPosition(position) {
    if (position.x !== undefined && position.y !== undefined) {
      // Simple coordinates
      return { x: position.x, y: position.y };
    }
    
    if (position.nodeId) {
      // Frame offset
      return {
        node_id: position.nodeId,
        node_offset: { x: position.offsetX || 0, y: position.offsetY || 0 }
      };
    }
    
    throw new ValidationError('Invalid position format');
  }

  /**
   * Get current user ID (helper for reaction toggle functionality)
   * @returns {Promise<string>} Current user ID
   * @private
   */
  async _getCurrentUserId() {
    try {
      // Use the /v1/me endpoint to get current user info
      const userInfo = await this.fetcher.request('/v1/me');
      return userInfo.id;
    } catch (error) {
      this.logger.warn('Could not get current user ID:', error.message);
      throw new CommentError('Unable to determine current user for reaction toggle');
    }
  }

  _exportToCsv(comments) {
    const headers = ['ID', 'Message', 'User', 'Created At', 'Resolved At', 'Parent ID'];
    const rows = [headers.join(',')];
    
    for (const comment of comments) {
      const row = [
        comment.id,
        `"${comment.message.replace(/"/g, '""')}"`,
        comment.user.handle,
        comment.created_at,
        comment.resolved_at || '',
        comment.parent_id || ''
      ];
      rows.push(row.join(','));
    }
    
    return rows.join('\n');
  }

  _exportToMarkdown(comments) {
    const lines = ['# Figma Comments Export', ''];
    
    const rootComments = comments.filter(c => !c.parent_id);
    
    for (const comment of rootComments) {
      lines.push(`## Comment by ${comment.user.handle}`);
      lines.push(`**Date:** ${new Date(comment.created_at).toLocaleString()}`);
      lines.push(`**ID:** ${comment.id}`);
      lines.push('');
      lines.push(comment.message);
      lines.push('');
      
      // Add replies
      const replies = comments.filter(c => c.parent_id === comment.id);
      if (replies.length > 0) {
        lines.push('### Replies');
        for (const reply of replies) {
          lines.push(`- **${reply.user.handle}** (${new Date(reply.created_at).toLocaleString()}): ${reply.message}`);
        }
        lines.push('');
      }
    }
    
    return lines.join('\n');
  }
}

export default FigmaCommentsService;