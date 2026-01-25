import { getDayTimestamps, batchArray, sleep, isToday } from '../src/helpers'

describe('getDayTimestamps', () => {
  beforeEach(() => {
    // Set a fixed date for testing: Jan 15, 2026 at 10:30:45.123
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-15T10:30:45.123Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should return array with single timestamp for 0 days back', () => {
    const result = getDayTimestamps(0)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe(new Date('2026-01-15T00:00:00.000Z').getTime())
  })

  it('should return timestamps for N days back including today', () => {
    const result = getDayTimestamps(3)

    expect(result).toHaveLength(4) // 3 days back + today = 4 timestamps
  })

  it('should return timestamps at midnight (00:00:00)', () => {
    const result = getDayTimestamps(2)

    result.forEach((timestamp) => {
      const date = new Date(timestamp)
      expect(date.getUTCHours()).toBe(0)
      expect(date.getUTCMinutes()).toBe(0)
      expect(date.getUTCSeconds()).toBe(0)
      expect(date.getUTCMilliseconds()).toBe(0)
    })
  })

  it('should return timestamps in ascending order (oldest to newest)', () => {
    const result = getDayTimestamps(5)

    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1])
    }
  })

  it('should return correct timestamps for 7 days back', () => {
    const result = getDayTimestamps(7)

    expect(result).toHaveLength(8)
    expect(result[0]).toBe(new Date('2026-01-08T00:00:00.000Z').getTime()) // 7 days ago
    expect(result[7]).toBe(new Date('2026-01-15T00:00:00.000Z').getTime()) // today
  })

  it('should have exactly 24 hours (86400000 ms) between consecutive timestamps', () => {
    const result = getDayTimestamps(3)
    const oneDayInMs = 24 * 60 * 60 * 1000

    for (let i = 1; i < result.length; i++) {
      expect(result[i] - result[i - 1]).toBe(oneDayInMs)
    }
  })

  it('should handle month boundaries correctly', () => {
    jest.setSystemTime(new Date('2026-02-03T15:45:30.000Z'))
    const result = getDayTimestamps(5)

    expect(result).toHaveLength(6)
    expect(result[0]).toBe(new Date('2026-01-29T00:00:00.000Z').getTime()) // Crosses into January
    expect(result[5]).toBe(new Date('2026-02-03T00:00:00.000Z').getTime())
  })

  it('should handle year boundaries correctly', () => {
    jest.setSystemTime(new Date('2026-01-02T12:00:00.000Z'))
    const result = getDayTimestamps(3)

    expect(result).toHaveLength(4)
    expect(result[0]).toBe(new Date('2025-12-30T00:00:00.000Z').getTime()) // Crosses into 2025
    expect(result[3]).toBe(new Date('2026-01-02T00:00:00.000Z').getTime())
  })

  it('should return empty array for negative days', () => {
    const result = getDayTimestamps(-1)

    expect(result).toHaveLength(0)
  })

  it('should ignore current time and always use midnight', () => {
    // Even though current time is 10:30:45, timestamps should be at 00:00:00
    const result = getDayTimestamps(1)

    expect(result).toHaveLength(2)
    expect(new Date(result[0]).getUTCHours()).toBe(0)
    expect(new Date(result[1]).getUTCHours()).toBe(0)
  })
})

describe('batchArray', () => {
  it('should split array into batches of specified size', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    const result = batchArray(items, 3)

    expect(result).toEqual([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8]
    ])
  })

  it('should handle array that divides evenly', () => {
    const items = [1, 2, 3, 4, 5, 6]
    const result = batchArray(items, 2)

    expect(result).toEqual([
      [1, 2],
      [3, 4],
      [5, 6]
    ])
  })

  it('should handle batch size equal to array length', () => {
    const items = [1, 2, 3]
    const result = batchArray(items, 3)

    expect(result).toEqual([[1, 2, 3]])
  })

  it('should handle batch size larger than array length', () => {
    const items = [1, 2, 3]
    const result = batchArray(items, 5)

    expect(result).toEqual([[1, 2, 3]])
  })

  it('should handle batch size of 1', () => {
    const items = [1, 2, 3]
    const result = batchArray(items, 1)

    expect(result).toEqual([[1], [2], [3]])
  })

  it('should handle empty array', () => {
    const items: number[] = []
    const result = batchArray(items, 3)

    expect(result).toEqual([])
  })

  it('should work with string arrays', () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    const result = batchArray(items, 2)

    expect(result).toEqual([['a', 'b'], ['c', 'd'], ['e']])
  })

  it('should work with object arrays', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
    const result = batchArray(items, 2)

    expect(result).toEqual([
      [{ id: 1 }, { id: 2 }],
      [{ id: 3 }, { id: 4 }]
    ])
  })

  it('should throw error for batch size of 0', () => {
    const items = [1, 2, 3]

    expect(() => batchArray(items, 0)).toThrow('Batch size must be greater than 0')
  })

  it('should throw error for negative batch size', () => {
    const items = [1, 2, 3]

    expect(() => batchArray(items, -1)).toThrow('Batch size must be greater than 0')
  })

  it('should not mutate original array', () => {
    const items = [1, 2, 3, 4, 5]
    const original = [...items]
    batchArray(items, 2)

    expect(items).toEqual(original)
  })
})

describe('sleep', () => {
  beforeEach(() => {
    jest.useRealTimers()
  })

  it('should resolve after specified milliseconds', async () => {
    const start = Date.now()
    await sleep(100)
    const elapsed = Date.now() - start

    expect(elapsed).toBeGreaterThanOrEqual(100)
    expect(elapsed).toBeLessThan(150) // Allow some tolerance for execution time
  })

  it('should resolve immediately for 0 milliseconds', async () => {
    const start = Date.now()
    await sleep(0)
    const elapsed = Date.now() - start

    expect(elapsed).toBeLessThan(10)
  })

  it('should be awaitable', async () => {
    let completed = false

    const promise = sleep(50).then(() => {
      completed = true
    })

    expect(completed).toBe(false)
    await promise
    expect(completed).toBe(true)
  })

  it('should work with fake timers', async () => {
    jest.useFakeTimers()
    const mockFn = jest.fn()

    const promise = sleep(1000).then(mockFn)

    expect(mockFn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(500)
    await Promise.resolve() // Flush microtasks
    expect(mockFn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(500)
    await promise
    expect(mockFn).toHaveBeenCalledTimes(1)

    jest.useRealTimers()
  })

  it('should work in sequence', async () => {
    const order: number[] = []

    await sleep(10)
    order.push(1)
    await sleep(10)
    order.push(2)
    await sleep(10)
    order.push(3)

    expect(order).toEqual([1, 2, 3])
  })

  it('should work in parallel', async () => {
    const start = Date.now()

    await Promise.all([sleep(50), sleep(50), sleep(50)])

    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(50)
    expect(elapsed).toBeLessThan(100) // Should run in parallel, not 150ms
  })
})

describe('isToday', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should return true for current date', () => {
    jest.setSystemTime(new Date('2026-01-25T14:30:45.123Z'))
    const today = new Date('2026-01-25T10:00:00.000Z')

    expect(isToday(today)).toBe(true)
  })

  it('should return true for date with different time but same day', () => {
    jest.setSystemTime(new Date('2026-01-25T08:00:00.000Z'))
    const todayDifferentTime = new Date('2026-01-25T23:59:59.999Z')

    expect(isToday(todayDifferentTime)).toBe(true)
  })

  it('should return false for yesterday', () => {
    jest.setSystemTime(new Date('2026-01-25T12:00:00.000Z'))
    const yesterday = new Date('2026-01-24T12:00:00.000Z')

    expect(isToday(yesterday)).toBe(false)
  })

  it('should return false for tomorrow', () => {
    jest.setSystemTime(new Date('2026-01-25T12:00:00.000Z'))
    const tomorrow = new Date('2026-01-26T12:00:00.000Z')

    expect(isToday(tomorrow)).toBe(false)
  })

  it('should return false for date in different month', () => {
    jest.setSystemTime(new Date('2026-01-25T12:00:00.000Z'))
    const differentMonth = new Date('2026-02-25T12:00:00.000Z')

    expect(isToday(differentMonth)).toBe(false)
  })

  it('should return false for date in different year', () => {
    jest.setSystemTime(new Date('2026-01-25T12:00:00.000Z'))
    const differentYear = new Date('2025-01-25T12:00:00.000Z')

    expect(isToday(differentYear)).toBe(false)
  })

  it('should handle midnight correctly', () => {
    jest.setSystemTime(new Date('2026-01-25T00:00:00.000Z'))
    const midnight = new Date('2026-01-25T00:00:00.000Z')

    expect(isToday(midnight)).toBe(true)
  })

  it('should handle end of day correctly', () => {
    jest.setSystemTime(new Date('2026-01-25T23:59:59.999Z'))
    const endOfDay = new Date('2026-01-25T00:00:00.000Z')

    expect(isToday(endOfDay)).toBe(true)
  })

  it('should handle leap year date', () => {
    jest.setSystemTime(new Date('2024-02-29T12:00:00.000Z'))
    const leapDay = new Date('2024-02-29T18:00:00.000Z')

    expect(isToday(leapDay)).toBe(true)
  })

  it('should work with date objects created from timestamps', () => {
    jest.setSystemTime(new Date('2026-01-25T12:00:00.000Z'))
    const now = new Date()
    const fromTimestamp = new Date(now.getTime())

    expect(isToday(fromTimestamp)).toBe(true)
  })
})
