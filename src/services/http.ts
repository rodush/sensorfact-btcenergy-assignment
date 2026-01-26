import type { Got, Response, RetryObject } from 'got'
import got from 'got'
import { sleep } from '../helpers.js'
import { HTTP_REQUEST_TIMEOUT_MS } from '../constants.js'

interface HttpResponse<T> {
  body: T
  headers: Record<string, string | string[] | undefined>
  statusCode: number
}

export class HttpService {
  private httpClient: Got
  private lastRequestTimePerPath: Record<string, number> = {}
  private requestQueuePerPath: Record<string, Promise<void>> = {}
  private readonly minRequestInterval: number = 10_000 // 10 seconds between requests per endpoint

  public constructor(baseUrl: string) {
    this.httpClient = got.extend({
      prefixUrl: baseUrl,
      timeout: { request: HTTP_REQUEST_TIMEOUT_MS },
      retry: {
        limit: 3,
        statusCodes: [408, 413, 429, 500, 502, 503, 504, 521, 522, 524],
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        calculateDelay: ({ attemptCount, retryOptions, error, computedValue }: RetryObject) => {
          // Handle 429 with Retry-After header
          if (error?.response?.statusCode === 429) {
            const retryAfter = error.response.headers['retry-after']

            console.warn(
              `Received 429 Too Many Requests. Retry attempt #${attemptCount}. Retry-After: ${retryAfter}`
            )

            if (retryAfter) {
              // Retry-After can be in seconds or a date
              const retryAfterNumber = Number(retryAfter)
              if (!isNaN(retryAfterNumber)) {
                // It's in seconds
                return retryAfterNumber * 1000
              } else {
                // It's a date
                const retryDate = new Date(retryAfter as string)
                const delay = retryDate.getTime() - Date.now()
                return Math.max(0, delay)
              }
            }
          }

          // Default exponential backoff
          return computedValue
        }
      },
      headers: {
        'content-type': 'application/json'
      },
      responseType: 'json'
    })
  }

  public async get<T>(path: string): Promise<HttpResponse<T>> {
    await this.waitForRateLimit(path)

    const response: Response<T> = await this.httpClient.get<T>(path)

    return {
      body: response.body,
      headers: response.headers,
      statusCode: response.statusCode
    }
  }

  private getPathSegment(path: string): string {
    // Extract first segment of the path (before any resource identifier)
    // Examples: "rawblock/hash" -> "rawblock", "rawtx/123" -> "rawtx"
    // Handle full URLs by extracting path after domain
    let cleanPath = path
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const url = new URL(path)
      cleanPath = url.pathname
    }
    
    // Remove leading slash and get first segment
    const firstSegment = cleanPath.replace(/^\//, '').split('/')[0]
    return firstSegment || 'default'
  }

  private async waitForRateLimit(path: string): Promise<void> {
    const pathSegment = this.getPathSegment(path)

    // Initialize queue for this path segment if it doesn't exist
    if (!this.requestQueuePerPath[pathSegment]) {
      this.requestQueuePerPath[pathSegment] = Promise.resolve()
      this.lastRequestTimePerPath[pathSegment] = 0
    }

    // Chain this request after the previous one for this path segment
    this.requestQueuePerPath[pathSegment] = this.requestQueuePerPath[pathSegment].then(async () => {
      const now = Date.now()
      const timeSinceLastRequest = now - this.lastRequestTimePerPath[pathSegment]

      if (timeSinceLastRequest < this.minRequestInterval) {
        const waitTime = this.minRequestInterval - timeSinceLastRequest
        console.debug(
          `[HttpService] Rate limiting ${pathSegment}: waiting ${waitTime}ms`
        )
        await sleep(waitTime)
      }

      this.lastRequestTimePerPath[pathSegment] = Date.now()
    })

    // Wait for this request's turn
    await this.requestQueuePerPath[pathSegment]
  }
}
