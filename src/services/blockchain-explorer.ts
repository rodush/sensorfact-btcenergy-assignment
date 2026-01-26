import {
  BlockchainItemData,
  BlockData,
  BlocksPerDayResponse,
  WalletAddressResponse
} from '../types.js'
import { CacheService } from './cache.js'
import { HttpService } from './http.js'
import { isToday } from '../helpers.js'

export class BlockchainExplorerService {
  private blockchainExplorer: HttpService

  public constructor(
    httpService: HttpService,
    private cacheService: CacheService
  ) {
    // TODO: best for DI and testing would be to pass httpService from outside
    this.blockchainExplorer = httpService
  }

  public async fetchBlockByHash(blockHash: string): Promise<BlockData> {
    console.info(`[BlockchainExplorer] Fetching block: ${blockHash}`)

    let block = await this.cacheService.get<BlockData>(blockHash)

    if (!block) {
      const response = await this.blockchainExplorer.get<BlockData>(
        `rawblock/${blockHash}?format=json`
      )
      block = response.body

      // skip saving today's blocks to cache as they might change
      if (!isToday(new Date(block.time * 1000))) {
        await this.cacheService.set(blockHash, block)
      } else {
        console.info(`Skipping caching today's block ${blockHash}`)
      }
    }

    return {
      hash: block.hash,
      size: block.size,
      tx: block.tx.map((tx) => ({
        hash: tx.hash,
        size: tx.size,
        time: tx.time
      }))
    } as BlockData
  }

  public async fetchTransactionByHash(txHash: string): Promise<BlockchainItemData> {
    console.info(`[BlockchainExplorer] Fetching transaction details: ${txHash}`)

    let tx = await this.cacheService.get<BlockchainItemData>(txHash)

    if (!tx) {
      const response = await this.blockchainExplorer.get<BlockchainItemData>(
        `rawtx/${txHash}?format=json`
      )
      tx = response.body

      // To reduce cache size we could only store necessary fields
      // XXX: Transaction might be cancelled, but it still might have consumed the energy, so we cache it anyway
      await this.cacheService.set(txHash, { hash: tx.hash, size: tx.size, time: tx.time })
    }

    return {
      hash: tx.hash,
      size: tx.size,
      time: tx.time
    } as BlockchainItemData
  }

  public async fetchBlockHashesPerDay(dateTimeMs: number): Promise<string[]> {
    const response = await this.blockchainExplorer.get<BlocksPerDayResponse[]>(
      `https://blockchain.info/blocks/${dateTimeMs}?format=json`
    )

    return response.body.map((block: BlocksPerDayResponse) => block.hash)
  }

  public async fetchWalletTransactions(
    address: string,
    offset: number = 0
  ): Promise<WalletAddressResponse> {
    console.info(
      `[BlockchainExplorer] Fetching wallet transactions for: ${address}, offset: ${offset}`
    )

    const cacheKey = `wallet:${address}:${offset}`
    let walletData = await this.cacheService.get<WalletAddressResponse>(cacheKey)

    if (!walletData) {
      const response = await this.blockchainExplorer.get<WalletAddressResponse>(
        `rawaddr/${address}?offset=${offset}`
      )
      walletData = response.body

      // Cache wallet data for a shorter period since it can change
      // Only cache if there are transactions
      if (walletData.txs && walletData.txs.length > 0) {
        await this.cacheService.set(cacheKey, walletData, 1000 * 60 * 60) // 1 hour TTL
      }
    }

    return {
      address: walletData.address,
      n_tx: walletData.n_tx,
      txs: walletData.txs.map((tx) => ({
        hash: tx.hash,
        size: tx.size,
        time: tx.time
      }))
    }
  }
}
