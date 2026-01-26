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

  // Fetch first page to get total transaction count
  const firstPage = await context.services.blockchainExplorer.fetchWalletTransactions(
    args.address,
    0
  )

  const totalTransactions = firstPage.n_tx
  const pageSize = 50 // API default limit
  const totalPages = Math.ceil(totalTransactions / pageSize)

  console.info(
    `[WalletResolver] Total transactions: ${totalTransactions}, pages needed: ${totalPages}`
  )

  // Collect all transactions from first page
  let allTransactions: WalletTransaction[] = firstPage.txs.map((tx) => ({
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

    // Fetch all remaining pages in parallel
    const results = await Promise.all(remainingPages)

    // Merge all transactions
    for (const pageData of results) {
      const pageTxs = pageData.txs.map((tx) => ({
        hash: tx.hash,
        size: tx.size,
        consumedEnergy: tx.size * WATT_PER_BYTE
      }))
      allTransactions = allTransactions.concat(pageTxs)
    }
  }

  const totalConsumedEnergy = allTransactions.reduce((sum, tx) => sum + tx.consumedEnergy, 0)

  return {
    address: firstPage.address,
    totalTransactions,
    consumedEnergy: totalConsumedEnergy,
    transactions: allTransactions
  }
}
