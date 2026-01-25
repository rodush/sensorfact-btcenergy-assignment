import { LRUCache } from 'lru-cache'
import { CACHE_DEFAULT_TTL_MS, CACHE_MAX_SIZE } from '..//constants'

// This service provides a simple in-memory cache with LRU eviction policy.
// In real life this can not-be local in-memory cache,
// because we are talking distributed environment,
// we would use something like Redis or Memcached - centralized caching service.
// Inject Redis client if needed, preserving the same interface.

export class CacheService {
  private cache: LRUCache<string, string>

  constructor(maxSize: number = CACHE_MAX_SIZE, defaultTtlMs: number = CACHE_DEFAULT_TTL_MS) {
    this.cache = new LRUCache({
      max: maxSize,
      ttl: defaultTtlMs,
      updateAgeOnGet: true // Update age on get (true LRU behavior)
    })
  }

  public async get<T>(key: string): Promise<T | null> {
    const serialized = this.cache.get(key)

    console.debug(
      `Cache ${serialized ? 'HIT' : 'MISS'} for key: ${key}. Cache size: ${this.cache.size}`
    )

    if (!serialized) {
      return null
    }

    try {
      return JSON.parse(serialized) as T
    } catch (error) {
      console.error(`Failed to deserialize cache entry for key: ${key}`, error)
      return null
    }
  }

  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value)
      const options = ttlSeconds ? { ttl: ttlSeconds * 1000 } : undefined
      this.cache.set(key, serialized, options)
      console.debug(
        `Cache SET for key: ${key}. New cache size: ${this.cache.size}. TTL: ${ttlSeconds ? ttlSeconds + 's' : 'default'}`
      )
    } catch (error) {
      console.error(`Failed to serialize cache entry for key: ${key}`, error)
      throw error
    }
  }

  public async delete(key: string): Promise<boolean> {
    return this.cache.delete(key)
  }

  public async clear(): Promise<void> {
    this.cache.clear()
  }

  public size(): number {
    return this.cache.size
  }

  public has(key: string): boolean {
    return this.cache.has(key)
  }
}
