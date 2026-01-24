import { GraphQLResolveInfo } from 'graphql'
import { WATT_PER_BYTE } from '../constants'

export type Transaction = {
  hash: string
  size: number
  consumedEnergy: number
}

export default async function transactionByHashResolver(
  source: any,
  args: any,
  context: any,
  info: GraphQLResolveInfo
): Promise<Transaction> {
  const tx: Transaction = await context.services.blockchainExplorer.fetchTransactionByHash(args.txHash)
  return {
    hash: tx.hash,
    size: tx.size,
    consumedEnergy: tx.size * WATT_PER_BYTE
  }
}
