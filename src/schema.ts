import { SchemaComposer } from 'graphql-compose'
import blockByHashResolver from './resolvers/block.resolver'
import consumptionPerDayResolver from './resolvers/per-day.resolver'
import walletConsumptionResolver from './resolvers/wallet.resolver'

const schemaComposer = new SchemaComposer()

const TxTypeTC = schemaComposer.createObjectTC({
  name: 'Transaction',
  fields: {
    hash: 'String!',
    size: 'Int!',
    consumedEnergy: 'Float!'
  }
})

const BlockTypeTC = schemaComposer.createObjectTC({
  name: 'Block',
  fields: {
    hash: 'String!',
    transactions: TxTypeTC.List,
    size: 'Int!',
    consumedEnergy: 'Float!'
  }
})

const PerDayTypeTC = schemaComposer.createObjectTC({
  name: 'ConsumptionPerDay',
  fields: {
    timestamp: 'String!',
    consumedEnergy: 'Float!'
  }
})

const WalletTransactionTC = schemaComposer.createObjectTC({
  name: 'WalletTransaction',
  fields: {
    hash: 'String!',
    size: 'Int!',
    consumedEnergy: 'Float!'
  }
})

const WalletConsumptionTC = schemaComposer.createObjectTC({
  name: 'WalletConsumption',
  fields: {
    address: 'String!',
    totalTransactions: 'Int!',
    consumedEnergy: 'Float!',
    transactions: WalletTransactionTC.List
  }
})

schemaComposer.Query.addFields({
  EnergyByBlock: {
    type: BlockTypeTC,
    args: { blockHash: 'String!' },
    resolve: blockByHashResolver
  },
  ConsumptionPerDay: {
    type: [PerDayTypeTC],
    args: { numDays: 'Int!' },
    resolve: consumptionPerDayResolver
  },
  EnergyByWallet: {
    type: WalletConsumptionTC,
    args: {
      address: 'String!'
    },
    resolve: walletConsumptionResolver
  }
})

export const schema = schemaComposer.buildSchema()
