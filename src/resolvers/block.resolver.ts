import { WATT_PER_BYTE } from '../constants'
import { BlockchainItemData, BlockchainExplorerService } from '../services/blockchain-explorer'

export type EnergyByBlock = {
  hash: string
  size: number
  consumedEnergy: number
}

export default async function blockByHashResolver(
  source: string,
  args: { blockHash: string },
  context: { services: { blockchainExplorer: BlockchainExplorerService } }
): Promise<EnergyByBlock> {
  const block: BlockchainItemData = await context.services.blockchainExplorer.fetchBlockByHash(args.blockHash)
  
  return {
    hash: block.hash,
    size: block.size,
    consumedEnergy: block.size * WATT_PER_BYTE
  }
}
