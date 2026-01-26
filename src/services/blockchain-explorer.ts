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
    if (!blockHash || typeof blockHash !== 'string' || blockHash.trim().length === 0) {
      throw new Error('Invalid block hash: must be a non-empty string')
    }

    console.info(`[BlockchainExplorer] Fetching block: ${blockHash}`)

    try {
      let block = await this.cacheService.get<BlockData>(blockHash)

      if (!block) {
        const response = await this.blockchainExplorer.get<BlockData>(
          `rawblock/${blockHash}?format=json`
        )
        block = response.body

        // Validate required fields
        if (!block || !block.hash || block.size === undefined || !Array.isArray(block.tx)) {
          throw new Error(`Invalid block data received for hash: ${blockHash}`)
        }

        // skip saving today's blocks to cache as they might change
        if (block.time && !isToday(new Date(block.time * 1000))) {
          await this.cacheService.set(blockHash, block)
        } else {
          console.info(`Skipping caching today's block ${blockHash}`)
        }
      }

      return {
        hash: block.hash,
        size: block.size,
        time: block.time,
        tx: block.tx.map((tx) => ({
          hash: tx.hash,
          size: tx.size,
          time: tx.time
        }))
      } as BlockData
    } catch (error) {
      console.error(`[BlockchainExplorer] Failed to fetch block ${blockHash}:`, error)
      throw error
    }
  }

  public async fetchTransactionByHash(txHash: string): Promise<BlockchainItemData> {
    if (!txHash || typeof txHash !== 'string' || txHash.trim().length === 0) {
      throw new Error('Invalid transaction hash: must be a non-empty string')
    }

    console.info(`[BlockchainExplorer] Fetching transaction details: ${txHash}`)

    try {
      let tx = await this.cacheService.get<BlockchainItemData>(txHash)

      if (!tx) {
        const response = await this.blockchainExplorer.get<BlockchainItemData>(
          `rawtx/${txHash}?format=json`
        )
        tx = response.body

        // Validate required fields
        if (!tx || !tx.hash || tx.size === undefined) {
          throw new Error(`Invalid transaction data received for hash: ${txHash}`)
        }

        // To reduce cache size we could only store necessary fields
        // XXX: Transaction might be cancelled, but it still might have consumed the energy, so we cache it anyway
        await this.cacheService.set(txHash, { hash: tx.hash, size: tx.size, time: tx.time })
      }

      return {
        hash: tx.hash,
        size: tx.size,
        time: tx.time
      } as BlockchainItemData
    } catch (error) {
      console.error(`[BlockchainExplorer] Failed to fetch transaction ${txHash}:`, error)
      throw error
    }
  }

  public async fetchBlockHashesPerDay(dateTimeMs: number): Promise<string[]> {
    if (!Number.isFinite(dateTimeMs) || dateTimeMs < 0) {
      throw new Error('Invalid timestamp: must be a non-negative number')
    }

    try {
      const response = await this.blockchainExplorer.get<BlocksPerDayResponse[]>(
        `https://blockchain.info/blocks/${dateTimeMs}?format=json`
      )

      if (!Array.isArray(response.body)) {
        throw new Error(`Invalid response: expected array of blocks for timestamp ${dateTimeMs}`)
      }

      return response.body
        .map((block: BlocksPerDayResponse) => {
          if (!block || !block.hash) {
            console.warn(`[BlockchainExplorer] Block with missing hash in day ${dateTimeMs}`)
            return ''
          }
          return block.hash
        })
        .filter((hash) => hash.length > 0)
    } catch (error) {
      console.error(`[BlockchainExplorer] Failed to fetch blocks for day ${dateTimeMs}:`, error)
      throw error
    }
  }

  public async fetchWalletTransactions(
    address: string,
    offset: number = 0
  ): Promise<WalletAddressResponse> {
    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      throw new Error('Invalid wallet address: must be a non-empty string')
    }

    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error('Invalid offset: must be a non-negative integer')
    }

    console.info(
      `[BlockchainExplorer] Fetching wallet transactions for: ${address}, offset: ${offset}`
    )

    try {
      const cacheKey = `wallet:${address}:${offset}`
      let walletData = await this.cacheService.get<WalletAddressResponse>(cacheKey)

      if (!walletData) {
        const response = await this.blockchainExplorer.get<WalletAddressResponse>(
          `rawaddr/${address}?offset=${offset}`
        )
        walletData = response.body

        // Validate required fields
        if (!walletData || !walletData.address || walletData.n_tx === undefined) {
          throw new Error(`Invalid wallet data received for address: ${address}`)
        }

        // Ensure txs is an array
        if (!Array.isArray(walletData.txs)) {
          walletData.txs = []
        }

        // Cache wallet data for a shorter period since it can change
        // Only cache if there are transactions
        if (walletData.txs.length > 0) {
          await this.cacheService.set(cacheKey, walletData, 1000 * 60 * 60) // 1 hour TTL
        }
      }

      return {
        address: walletData.address,
        n_tx: walletData.n_tx,
        txs: walletData.txs.map((tx) => ({
          hash: tx.hash || '',
          size: tx.size || 0,
          time: tx.time || 0
        }))
      }
    } catch (error) {
      console.error(
        `[BlockchainExplorer] Failed to fetch wallet ${address} at offset ${offset}:`,
        error
      )
      throw error
    }
  }
}
