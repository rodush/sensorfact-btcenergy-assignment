/**
 * Generates a list of unix milliseconds representing midnight (00:00:00 UTC) for N days back
 * @param daysBack - Number of days to go back from today
 * @returns Array of unix timestamps in milliseconds, starting from N days ago to today
 */
export function getDayTimestamps(daysBack: number): number[] {
  const timestamps: number[] = [];
  const now = new Date();

  for (let i = daysBack; i >= 0; i--) {
    const date = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - i,
      0,
      0,
      0,
      0
    ));
    timestamps.push(date.getTime());
  }

  return timestamps;
}

/**
 * Splits an array into batches of a specified size
 * @param items - Array of items to split into batches
 * @param batchSize - Size of each batch
 * @returns Array of batches, where each batch is an array of items
 */
export function batchArray<T>(items: T[], batchSize: number): T[][] {
  if (batchSize <= 0) {
    throw new Error('Batch size must be greater than 0');
  }

  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  return batches;
}

/**
 * Delays execution for a specified number of milliseconds
 * @param ms - Number of milliseconds to sleep
 * @returns Promise that resolves after the specified delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
