import { CacheService } from './cache.js'
import { HttpService } from './http.js'

export type BlockchainItemData = {
  // We don't need all fields, just those which we will be using for our purposes
  hash: string
  size: number
}

type BlocksPerDayResponse = {
  hash: string
  block_index: number
}

export class BlockchainExplorerService {
  private blockchainExplorer: HttpService

  public constructor(private cacheService: CacheService) {
    // TODO: best for DI and testing would be to pass httpService from outside
    this.blockchainExplorer = new HttpService('https://blockchain.info/')
  }

  public async fetchBlockByHash(blockHash: string): Promise<BlockchainItemData> {
    console.debug(`[BlockchainExplorer] Fetching block: ${blockHash}`)
    let block = await this.cacheService.get<BlockchainItemData>(blockHash)

    if (!block) {
      console.debug(`[BlockchainExplorer] Block ${blockHash} not in cache, fetching from API`)
      const response = await this.blockchainExplorer.get<BlockchainItemData>(
        `rawblock/${blockHash}?format=json`
      )
      block = response.body

      // We don't really need all the details in the cache, just those required for our usage
      console.debug(`[BlockchainExplorer] Storing block ${blockHash} in cache`)
      await this.cacheService.set(blockHash, {
        hash: block.hash,
        size: block.size
      })
    } else {
      console.debug(`[BlockchainExplorer] Block ${blockHash} found in cache`)
    }

    return block
  }

  public async fetchTransactionByHash(txHash: string): Promise<BlockchainItemData> {
    let tx = await this.cacheService.get<BlockchainItemData>(txHash)

    if (!tx) {
      console.log(`Cache miss for transaction ${txHash}, fetching from blockchain explorer...`)

      const response = await this.blockchainExplorer.get<BlockchainItemData>(
        `rawtx/${txHash}?format=json`
      )
      tx = response.body

      // To reduce cache size we could only store necessary fields
      await this.cacheService.set(txHash, { hash: tx.hash, size: tx.size })
    }

    return tx
  }

  public async fetchBlockHashesPerDay(dateTimeMs: number): Promise<string[]> {
    const response = await this.blockchainExplorer.get<BlocksPerDayResponse[]>(
      `https://blockchain.info/blocks/${dateTimeMs}?format=json`
    )

    return response.body.map((block: BlocksPerDayResponse) => block.hash)
  }
}
