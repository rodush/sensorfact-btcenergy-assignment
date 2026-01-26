// It's better in watts to not have problem with the floating number serialisation, e.g.: "consumedEnergy": 989.5199999999999
export const WATT_PER_BYTE = 4_560
export const MAX_DAYS_BACK = 3 // TODO: Verify with requirements
export const HTTP_BATCH_SIZE = 5
export const CACHE_MAX_SIZE = 1_000 // Max number of items in cache
export const CACHE_DEFAULT_TTL_MS = 24 * 60 * 60 * 1000 // 1 day in milliseconds
export const HTTP_REQUEST_TIMEOUT_MS = 3_000 // 3 seconds
