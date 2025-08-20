/**
 * TypeScript definitions for Figma Dev Resources SDK
 */

export interface DevResource {
  id: string;
  name: string;
  url: string;
  file_key: string;
  node_id: string;
}

export interface CreateDevResourceInput {
  name: string;
  url: string;
  file_key: string;
  node_id: string;
}

export interface UpdateDevResourceInput {
  id: string;
  name?: string;
  url?: string;
}

export interface GetDevResourcesResponse {
  dev_resources: DevResource[];
}

export interface CreateDevResourcesResponse {
  links_created: DevResource[];
  errors?: Array<{
    file_key?: string | null;
    node_id?: string | null;
    error: string;
  }>;
}

export interface UpdateDevResourcesResponse {
  links_updated: DevResource[];
  errors?: Array<{
    id: string;
    error: string;
  }>;
}

export interface BatchCreateResult {
  links_created: DevResource[];
  errors: Array<{
    file_key?: string | null;
    node_id?: string | null;
    error: string;
  }>;
  total: number;
  processed: number;
}

export interface SyncResult {
  created: DevResource[];
  updated: DevResource[];
  deleted: Array<{
    success: boolean;
    fileKey: string;
    id: string;
    error?: string;
  }>;
  errors: Array<{
    error: string;
    [key: string]: any;
  }>;
}

export interface DevResourcesStats {
  total: number;
  byNode: Record<string, number>;
  byDomain: Record<string, number>;
  nodesWithResources: number;
  domains: number;
}

export interface ValidationResult extends DevResource {
  error: string;
}

export interface MultiFileResult {
  [fileKey: string]: {
    dev_resources: DevResource[];
    error?: string;
  };
}

export interface DeleteResult {
  success: boolean;
  fileKey: string;
  id: string;
  error?: string;
}

export interface RateLimiter {
  checkLimit(): Promise<void>;
}

export interface Cache {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
}

export interface Logger {
  debug(...args: any[]): void;
  error(...args: any[]): void;
}

export interface ClientConfig {
  accessToken: string;
  baseUrl?: string;
  logger?: Logger;
  rateLimiter?: RateLimiter;
  cache?: Cache;
  timeout?: number;
}

export interface GetDevResourcesOptions {
  nodeIds?: string | string[];
}

export interface TargetResource {
  nodeId: string;
  name: string;
  url: string;
  id?: string;
}

export interface FileResourceInput {
  nodeId: string;
  name: string;
  url: string;
}

export interface MultiFileResourceInput {
  fileKey: string;
  nodeId: string;
  name: string;
  url: string;
}

export interface ProgressCallback {
  (result: BatchCreateResult): void;
}

export declare class FigmaApiError extends Error {
  code: string;
  meta: Record<string, any>;
  constructor(message: string, code: string, meta?: Record<string, any>);
}

export declare class FigmaRateLimitError extends FigmaApiError {
  constructor(retryAfter: number);
}

export declare class FigmaAuthError extends FigmaApiError {
  constructor(message?: string);
}

export declare class FigmaValidationError extends FigmaApiError {
  constructor(message: string, validationErrors?: string[]);
}

export declare class FigmaDevResourcesClient {
  accessToken: string;
  baseUrl: string;
  logger: Logger;
  rateLimiter: RateLimiter | null;
  cache: Cache | null;
  timeout: number;

  constructor(config: ClientConfig);

  request(path: string, options?: RequestInit): Promise<any>;

  getDevResources(fileKey: string, options?: GetDevResourcesOptions): Promise<GetDevResourcesResponse>;

  createDevResources(devResources: CreateDevResourceInput[]): Promise<CreateDevResourcesResponse>;

  updateDevResources(devResources: UpdateDevResourceInput[]): Promise<UpdateDevResourcesResponse>;

  deleteDevResource(fileKey: string, devResourceId: string): Promise<any>;

  batchCreateDevResources(
    devResources: CreateDevResourceInput[],
    onProgress?: ProgressCallback | null,
    batchSize?: number
  ): Promise<BatchCreateResult>;

  getMultipleFileDevResources(
    fileKeys: string[],
    options?: GetDevResourcesOptions
  ): Promise<MultiFileResult>;
}

export declare class FigmaDevResourcesSDK {
  client: FigmaDevResourcesClient;

  constructor(config: ClientConfig);

  getFileDevResources(fileKey: string, nodeIds?: string | string[] | null): Promise<DevResource[]>;

  getNodeDevResources(fileKey: string, nodeIds: string[]): Promise<DevResource[]>;

  createDevResource(fileKey: string, nodeId: string, name: string, url: string): Promise<DevResource>;

  createFileDevResources(fileKey: string, resources: FileResourceInput[]): Promise<CreateDevResourcesResponse>;

  createMultiFileDevResources(resources: MultiFileResourceInput[]): Promise<CreateDevResourcesResponse>;

  updateDevResource(devResourceId: string, updates: Omit<UpdateDevResourceInput, 'id'>): Promise<DevResource>;

  updateMultipleDevResources(updates: UpdateDevResourceInput[]): Promise<UpdateDevResourcesResponse>;

  deleteDevResource(fileKey: string, devResourceId: string): Promise<void>;

  deleteMultipleDevResources(resources: Array<{ fileKey: string; id: string }>): Promise<DeleteResult[]>;

  syncFileDevResources(fileKey: string, targetResources: TargetResource[]): Promise<SyncResult>;

  searchDevResources(fileKey: string, pattern: string | RegExp): Promise<DevResource[]>;

  getDevResourcesByUrl(fileKey: string, urlPattern: string | RegExp): Promise<DevResource[]>;

  getDevResourcesStats(fileKey: string): Promise<DevResourcesStats>;

  validateDevResourceUrls(fileKey: string): Promise<ValidationResult[]>;
}

export default FigmaDevResourcesSDK;