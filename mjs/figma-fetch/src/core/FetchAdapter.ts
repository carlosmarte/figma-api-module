/**
 * Abstract base class for fetch adapters
 * Allows different fetch implementations (native fetch, undici, axios, etc.)
 */

import { FetchRequest, FetchResponse } from '../types/index.js';

/**
 * Abstract FetchAdapter class
 * Implement this class to create custom fetch adapters
 */
export abstract class FetchAdapter {
  /**
   * Execute a fetch request
   * @param request - The request configuration
   * @returns Promise resolving to the response
   */
  abstract fetch<T = any>(request: FetchRequest): Promise<FetchResponse<T>>;

  /**
   * Optional: Transform request before execution
   * Override this method to add custom request transformations
   * @param request - The original request
   * @returns The transformed request
   */
  protected transformRequest(request: FetchRequest): FetchRequest {
    return request;
  }

  /**
   * Optional: Transform response after execution
   * Override this method to add custom response transformations
   * @param response - The original response
   * @returns The transformed response
   */
  protected transformResponse<T>(response: FetchResponse<T>): FetchResponse<T> {
    return response;
  }

  /**
   * Helper: Create a timeout signal
   * @param timeout - Timeout in milliseconds
   * @returns AbortSignal that will abort after timeout
   */
  protected createTimeoutSignal(timeout: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller.signal;
  }

  /**
   * Helper: Parse response based on content type
   * @param response - Response object with text() or json() methods
   * @param contentType - Content-Type header value
   * @returns Parsed response data
   */
  protected async parseResponseData(
    response: { json: () => Promise<any>; text: () => Promise<string>; arrayBuffer: () => Promise<ArrayBuffer> },
    contentType: string | null
  ): Promise<any> {
    if (!contentType) {
      return null;
    }

    if (contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch {
        return null;
      }
    }

    if (contentType.includes('text/')) {
      return await response.text();
    }

    return await response.arrayBuffer();
  }

  /**
   * Helper: Convert Headers object to plain object
   * @param headers - Headers object or plain object
   * @returns Plain object with header key-value pairs
   */
  protected headersToObject(headers: any): Record<string, string> {
    if (!headers) {
      return {};
    }

    // If headers has entries method (like native Headers)
    if (typeof headers.entries === 'function') {
      const obj: Record<string, string> = {};
      for (const [key, value] of headers.entries()) {
        obj[key] = value;
      }
      return obj;
    }

    // If headers is already a plain object
    if (typeof headers === 'object') {
      return headers as Record<string, string>;
    }

    return {};
  }
}

export default FetchAdapter;
