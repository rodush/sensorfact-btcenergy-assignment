import { HTTP_BATCH_SIZE, MAX_DAYS_BACK, WATT_PER_BYTE } from 'src/constants'
import { batchArray, getDayTimestamps } from '../helpers'
import { BlockchainExplorerService, BlockchainItemData } from '../services/blockchain-explorer'

class DateLimitError extends Error {}

export default async function consumptionPerDayResolver(
  source: string,
  args: { numDays: number },
  context: { services: { blockchainExplorer: BlockchainExplorerService } }
): Promise<Record<string, number>> {
  const timestamps = getDayTimestamps(args.numDays)

  if (timestamps.length > MAX_DAYS_BACK) {
    throw new DateLimitError(`Cannot check more than ${MAX_DAYS_BACK} days back`)
  }

  const batchesOfDays = batchArray(timestamps, HTTP_BATCH_SIZE)

  const blockHashesList: Array<Record<number, string[]>> = []
  while (batchesOfDays.length > 0) {
    const batch = batchesOfDays.shift()
    if (!batch) continue

    // Process each batch (fetch data for each day in the batch)
    // TODO: Ideally we want to be more fault tolerant here, use Promise.allSettled and handle partial failures
    // TODO: Clarify tolerance towards dropped packages. How accurate we need the data?
    const results = await Promise.all(
      batch.map(async (ts) => ({
        [ts]: await context.services.blockchainExplorer.fetchBlockHashesPerDay(ts)
      }))
    )

    blockHashesList.push(...results)
  }

  console.debug('Fetched block hashes for days:', blockHashesList.flat())

  const finalResult: Record<string, number> = {}

  const totalPromises = blockHashesList.flatMap(async (entry: Record<number, string[]>) => {
    console.log('Processing entry:', entry)
    const [dateTs, blockHashesInDay] = Object.entries(entry)[0]

    console.debug('Block hashes for day', dateTs, ':', blockHashesInDay.length)

    // const batchesOfBlocksPerDay = batchArray(blockHashesInDay, HTTP_BATCH_SIZE)
    // XXX: Temporary limit to first 20 blocks for testing
    const batchesOfBlocksPerDay = batchArray(blockHashesInDay.slice(0, 20), HTTP_BATCH_SIZE)
    let wattPerDay = 0

    while (batchesOfBlocksPerDay.length > 0) {
      const batch = batchesOfBlocksPerDay.shift()
      if (!batch) continue

      // Process each batch (fetch data for each day in the batch)
      // TODO: Ideally we want to be more fault tolerant here, use Promise.allSettled and handle partial failures
      // TODO: Clarify tolerance towards dropped packages. How accurate we need the data?
      const blocksByHash: BlockchainItemData[] = await Promise.all(
        batch.map(async (hash) => await context.services.blockchainExplorer.fetchBlockByHash(hash))
      )
      wattPerDay += blocksByHash.reduce((acc, val) => acc + val.size * WATT_PER_BYTE, 0)

      break // TODO: Remove this break after testing to process all batches
    }

    finalResult[dateTs] = wattPerDay
  })

  await Promise.all(totalPromises)

  console.debug('Final consumption per day result:', finalResult)

  return finalResult
}
