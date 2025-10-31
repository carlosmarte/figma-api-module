/**
 * Native fetch adapter implementation
 * Uses the native fetch API available in Node.js 18+ and browsers
 */

import { FetchAdapter } from '../core/FetchAdapter.js';
import { FetchRequest, FetchResponse } from '../types/index.js';
import { NetworkError, TimeoutError } from '../errors/index.js';

/**
 * Adapter that uses native fetch API
 */
export class NativeFetchAdapter extends FetchAdapter {
  /**
   * Execute fetch request using native fetch
   */
  async fetch<T = any>(request: FetchRequest): Promise<FetchResponse<T>> {
    const transformedRequest = this.transformRequest(request);
    const { url, method = 'GET', headers, body, signal, timeout } = transformedRequest;

    try {
      // Create timeout signal if timeout is specified
      const finalSignal = timeout && !signal
        ? this.createTimeoutSignal(timeout)
        : signal;

      // Execute native fetch
      const response = await fetch(url, {
        method,
        headers: headers as HeadersInit,
        body: body as BodyInit,
        signal: finalSignal,
      });

      // Parse response
      const contentType = response.headers.get('content-type');
      const data = await this.parseResponseData(response, contentType);

      // Create FetchResponse
      const fetchResponse: FetchResponse<T> = {
        status: response.status,
        statusText: response.statusText,
        headers: this.headersToObject(response.headers),
        data,
        ok: response.ok,
      };

      return this.transformResponse(fetchResponse);

    } catch (error: any) {
      // Handle timeout
      if (error.name === 'AbortError') {
        throw new TimeoutError(timeout || 30000);
      }

      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new NetworkError('Network request failed', error);
      }

      // Re-throw other errors
      throw error;
    }
  }
}

export default NativeFetchAdapter;
