import { HTTP_BATCH_SIZE, MAX_DAYS_BACK } from "src/constants";
import { batchArray, getDayTimestamps, sleep } from "../helpers";
import { BlockchainExplorerService } from "../services/blockchain-explorer"

class DateLimitError extends Error {}

export default async function consumptionPerDayResolver(
  source: string,
  args: { numDays: number },
  context: { services: { blockchainExplorer: BlockchainExplorerService } }
) {
    const timestamps = getDayTimestamps(args.numDays);

    if (timestamps.length > MAX_DAYS_BACK) {
        throw new DateLimitError(`Cannot check more than ${MAX_DAYS_BACK} days back`);
    }

    const batchesOfDays = batchArray(timestamps, HTTP_BATCH_SIZE);
    const blockHashesList = []
    while (batchesOfDays.length > 0) {
        const batch = batchesOfDays.shift();
        if (!batch) continue;

        // Process each batch (fetch data for each day in the batch)
        // TODO: Ideally we want to be more fault tolerant here, use Promise.allSettled and handle partial failures
        // TODO: Clarify tolerance towards dropped packages. How accurate we need the data?
        const results = await Promise.all(batch.map(ts => context.services.blockchainExplorer.fetchBlockHashesPerDay(ts)));

        await sleep(500); // To avoid hitting rate limits

        blockHashesList.push(...results);
    }

    console.log('Fetched block hashes for days:', blockHashesList.length);

    return

    // const batchesOfBlocks = batchArray(blockHashesList.flat(), HTTP_BATCH_SIZE);
    // const blockDataPerDay = []
    // while (batchesOfBlocks.length > 0) {
    //     const batch = batchesOfBlocks.shift();
    //     if (!batch) continue;

    //     // Process each batch (fetch data for each day in the batch)
    //     // TODO: Ideally we want to be more fault tolerant here, use Promise.allSettled and handle partial failures
    //     // TODO: Clarify tolerance towards dropped packages. How accurate we need the data?
    //     const blocksByHash = await Promise.all(batch.map(hash => context.services.blockchainExplorer.fetchBlockByHash(hash)));
    //     blockDataPerDay.push(...blocksByHash);
    // }

    // return blockDataPerDay.flat()
}