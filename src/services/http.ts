import type { Got, Response, RetryObject } from 'got'
import got from 'got'
import { sleep } from '../helpers.js'

export interface HttpResponse<T> {
  body: T;
  headers: Record<string, string | string[] | undefined>;
  statusCode: number;
}

export class HttpService {
  private httpClient: Got
  private lastRequestTimeByPath: Map<string, number> = new Map()
  private readonly minRequestInterval: number = 10000 // 0.1 RPS = 1 request per 10 seconds

  public constructor(baseUrl: string) {
    this.httpClient = got.extend({
        prefixUrl: baseUrl,
        timeout: { request: 10000 },
        retry: {
          limit: 3,
          statusCodes: [408, 413, 429, 500, 502, 503, 504, 521, 522, 524],
          calculateDelay: ({ attemptCount, retryOptions, error, computedValue }: RetryObject) => {
            // Handle 429 with Retry-After header
            if (error?.response?.statusCode === 429) {
              const retryAfter = error.response.headers['retry-after'];

              console.debug(`Received 429 Too Many Requests. Retry attempt #${attemptCount}. Retry-After: ${retryAfter}`);
              
              if (retryAfter) {
                // Retry-After can be in seconds or a date
                const retryAfterNumber = Number(retryAfter);
                if (!isNaN(retryAfterNumber)) {
                  // It's in seconds
                  return retryAfterNumber * 1000;
                } else {
                  // It's a date
                  const retryDate = new Date(retryAfter as string);
                  const delay = retryDate.getTime() - Date.now();
                  return Math.max(0, delay);
                }
              }
            }
            
            // Default exponential backoff
            return computedValue;
          }
        },
        headers: {
            'content-type': 'application/json'
        },
        responseType: 'json'
      })
  }

  public async get<T>(path: string): Promise<HttpResponse<T>> {
    await this.waitForRateLimit(path);
    
    const response: Response<T> = await this.httpClient.get<T>(path);
    return {
      body: response.body,
      headers: response.headers,
      statusCode: response.statusCode
    };
  }

  private async waitForRateLimit(path: string): Promise<void> {
    const now = Date.now();
    const lastRequestTime = this.lastRequestTimeByPath.get(path) || 0;
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await sleep(waitTime);
    }
    
    this.lastRequestTimeByPath.set(path, Date.now());
  }
}
