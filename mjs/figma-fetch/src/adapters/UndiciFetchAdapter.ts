/**
 * Undici fetch adapter implementation
 * Uses undici's fetch with support for proxy configuration
 */

import { FetchAdapter } from '../core/FetchAdapter.js';
import { FetchRequest, FetchResponse, ProxyConfig } from '../types/index.js';
import { NetworkError, TimeoutError } from '../errors/index.js';

// Undici imports (will be dynamically imported to make it optional)
let undici: any = null;
let ProxyAgent: any = null;

/**
 * Adapter that uses undici fetch with proxy support
 */
export class UndiciFetchAdapter extends FetchAdapter {
  private proxyAgent: any = null;
  private proxyConfig: ProxyConfig;

  constructor(proxyConfig: ProxyConfig = {}) {
    super();
    this.proxyConfig = {
      url: proxyConfig.url || process.env.HTTP_PROXY,
      token: proxyConfig.token || process.env.HTTP_PROXY_TOKEN,
      enabled: proxyConfig.enabled !== false, // Default to enabled
    };

    this.initializeProxy();
  }

  /**
   * Initialize proxy agent if configured
   */
  private async initializeProxy(): Promise<void> {
    if (!this.proxyConfig.enabled || !this.proxyConfig.url) {
      return;
    }

    try {
      // Dynamically import undici
      if (!undici) {
        undici = await import('undici');
        ProxyAgent = undici.ProxyAgent;
      }

      // Create proxy agent
      if (this.proxyConfig.token) {
        this.proxyAgent = new ProxyAgent({
          uri: this.proxyConfig.url,
          token: this.proxyConfig.token,
        });
      } else {
        this.proxyAgent = new ProxyAgent(this.proxyConfig.url);
      }
    } catch (error) {
      console.error('Failed to initialize undici proxy:', error);
      this.proxyAgent = null;
    }
  }

  /**
   * Execute fetch request using undici
   */
  async fetch<T = any>(request: FetchRequest): Promise<FetchResponse<T>> {
    // Ensure undici is loaded
    if (!undici) {
      undici = await import('undici');
    }

    const transformedRequest = this.transformRequest(request);
    const { url, method = 'GET', headers, body, signal, timeout } = transformedRequest;

    try {
      // Create timeout signal if timeout is specified
      const finalSignal = timeout && !signal
        ? this.createTimeoutSignal(timeout)
        : signal;

      // Prepare fetch options
      const fetchOptions: any = {
        method,
        headers: headers as HeadersInit,
        body: body as BodyInit,
        signal: finalSignal,
      };

      // Add proxy dispatcher if configured
      if (this.proxyAgent) {
        fetchOptions.dispatcher = this.proxyAgent;
      }

      // Execute undici fetch
      const response = await undici.fetch(url, fetchOptions);

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
      if (error.name === 'AbortError' || error.code === 'UND_ERR_CONNECT_TIMEOUT') {
        throw new TimeoutError(timeout || 30000);
      }

      // Handle network errors
      if (
        error.name === 'TypeError' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        (error.message && error.message.includes('fetch'))
      ) {
        throw new NetworkError('Network request failed', error);
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Get current proxy configuration
   */
  getProxyConfig(): ProxyConfig {
    return { ...this.proxyConfig };
  }

  /**
   * Update proxy configuration
   */
  setProxyConfig(config: ProxyConfig): void {
    this.proxyConfig = {
      ...this.proxyConfig,
      ...config,
    };
    this.initializeProxy();
  }
}

export default UndiciFetchAdapter;
