import { WATT_PER_BYTE } from '../constants'
import {
  BlockchainItemData,
  BlockchainExplorerService,
  BlockData
} from '../services/blockchain-explorer'

export type EnergyByBlock = {
  hash: string
  size: number
  consumedEnergy: number
  transactions: EnergyByTransaction[]
}

export type EnergyByTransaction = {
  hash: string
  size: number
  consumedEnergy: number
}

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
    consumedEnergy: block.size * WATT_PER_BYTE,
    transactions: block.tx.map((tx: BlockchainItemData) => ({
      hash: tx.hash,
      size: tx.size,
      consumedEnergy: tx.size * WATT_PER_BYTE
    }))
  }
}
