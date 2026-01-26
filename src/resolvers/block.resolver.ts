import { BlockchainItemData, BlockData, EnergyByBlock } from '../types'
import { WATT_PER_BYTE } from '../constants'
import { BlockchainExplorerService } from '../services/blockchain-explorer'
import { GraphQLError } from 'graphql'

export default async function blockByHashResolver(
  source: string,
  args: { blockHash: string },
  context: { services: { blockchainExplorer: BlockchainExplorerService } }
): Promise<EnergyByBlock> {
  if (!args.blockHash || args.blockHash.trim().length === 0) {
    throw new GraphQLError('Block hash is required')
  }

  try {
    const block: BlockData = await context.services.blockchainExplorer.fetchBlockByHash(
      args.blockHash
    )
    return {
      hash: block.hash,
      size: block.size,
      time: block.time,
      consumedEnergy: block.size * WATT_PER_BYTE,
      transactions: block.tx.map((tx: BlockchainItemData) => ({
        hash: tx.hash,
        size: tx.size,
        time: tx.time,
        consumedEnergy: tx.size * WATT_PER_BYTE
      }))
    }
  } catch (error) {
    console.error(`[BlockResolver] Failed to resolve block ${args.blockHash}:`, error)
    throw new GraphQLError(
      `Failed to fetch block data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: error instanceof Error ? error : undefined }
    )
  }
}
