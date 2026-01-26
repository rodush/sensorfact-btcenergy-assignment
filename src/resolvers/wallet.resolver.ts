import { WATT_PER_BYTE } from '../constants'
import { BlockchainExplorerService } from '../services/blockchain-explorer'
import { GraphQLError } from 'graphql'

export type WalletEnergyConsumption = {
  address: string
  totalTransactions: number
  consumedEnergy: number
  transactions: WalletTransaction[]
}

export type WalletTransaction = {
  hash: string
  size: number
  consumedEnergy: number
}

export default async function walletConsumptionResolver(
  source: string,
  args: { address: string },
  context: { services: { blockchainExplorer: BlockchainExplorerService } }
): Promise<WalletEnergyConsumption> {
  if (!args.address || args.address.trim().length === 0) {
    throw new GraphQLError('Bitcoin address is required')
  }

  try {
    // Fetch first page to get total transaction count
    const firstPage = await context.services.blockchainExplorer.fetchWalletTransactions(
      args.address,
      0
    )

    const totalTransactions = firstPage.n_tx
    const pageSize = 50 // API default limit

    if (totalTransactions < 0) {
      throw new GraphQLError('Invalid transaction count received from API')
    }

    const totalPages = Math.ceil(totalTransactions / pageSize)

    console.info(
      `[WalletResolver] Total transactions: ${totalTransactions}, pages needed: ${totalPages}`
    )

    // Collect all transactions from first page
    let allTransactions: WalletTransaction[] = firstPage.txs
      .filter((tx) => tx && tx.hash && tx.size !== undefined)
      .map((tx) => ({
        hash: tx.hash,
        size: tx.size,
        consumedEnergy: tx.size * WATT_PER_BYTE
      }))

    // Fetch remaining pages if needed
    if (totalPages > 1) {
      const remainingPages = []
      for (let page = 1; page < totalPages; page++) {
        const offset = page * pageSize
        remainingPages.push(
          context.services.blockchainExplorer.fetchWalletTransactions(args.address, offset)
        )
      }

      // Fetch all remaining pages in parallel with error handling
      const results = await Promise.allSettled(remainingPages)

      // Merge all transactions, handling failures gracefully
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const pageData = result.value
          const pageTxs = pageData.txs
            .filter((tx) => tx && tx.hash && tx.size !== undefined)
            .map((tx) => ({
              hash: tx.hash,
              size: tx.size,
              consumedEnergy: tx.size * WATT_PER_BYTE
            }))
          allTransactions = allTransactions.concat(pageTxs)
        } else {
          console.error(`[WalletResolver] Failed to fetch page for ${args.address}:`, result.reason)
        }
      }
    }

    const totalConsumedEnergy = allTransactions.reduce((sum, tx) => sum + tx.consumedEnergy, 0)

    return {
      address: firstPage.address,
      totalTransactions,
      consumedEnergy: totalConsumedEnergy,
      transactions: allTransactions
    }
  } catch (error) {
    console.error(`[WalletResolver] Failed to resolve wallet ${args.address}:`, error)
    throw new GraphQLError(
      `Failed to fetch wallet data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: error instanceof Error ? error : undefined }
    )
  }
}
