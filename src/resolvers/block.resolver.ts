import { BlockchainItemData, BlockData, EnergyByBlock } from '../types'
import { WATT_PER_BYTE } from '../constants'
import { BlockchainExplorerService } from '../services/blockchain-explorer'

export default async function blockByHashResolver(
  source: string,
  args: { blockHash: string },
  context: { services: { blockchainExplorer: BlockchainExplorerService } }
): Promise<EnergyByBlock> {
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
}
