/**
 * Type declarations for FigmaLibraryAnalyticsClient
 */

export class LibraryAnalyticsError extends Error {
  constructor(message: string, code?: string, meta?: any);
  code?: string;
  meta?: any;
}

export class LibraryAnalyticsRateLimitError extends LibraryAnalyticsError {
  constructor(retryAfter?: number);
  retryAfter?: number;
}

export class LibraryAnalyticsAuthError extends LibraryAnalyticsError {
  constructor(message?: string);
}

export class LibraryAnalyticsValidationError extends LibraryAnalyticsError {
  constructor(message: string, validationErrors?: any[]);
  validationErrors?: any[];
}

export class FigmaLibraryAnalyticsClient {
  constructor(config: any);
  // Add method signatures as needed
}

export default FigmaLibraryAnalyticsClient;
