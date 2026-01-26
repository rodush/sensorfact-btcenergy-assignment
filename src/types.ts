// We don't need all fields, just those which we will be using for our purposes
export type BlockchainItemData = {
  hash: string
  size: number
  time: number
}

export type EnergyByBlock = BlockchainItemData & {
  consumedEnergy: number
  transactions: EnergyByTransaction[]
}

export type EnergyByTransaction = BlockchainItemData & {
  consumedEnergy: number
}

export type DailyEnergyConsumption = {
  timestamp: string
  consumedEnergy: number
}

export type BlocksPerDayResponse = {
  hash: string
  time: number
  block_index: number
}

export type BlockData = BlockchainItemData & {
  tx: BlockchainItemData[]
}
