import { SchemaComposer } from 'graphql-compose'
import blockByHashResolver from './resolvers/block.resolver'
import transactionByHashResolver from './resolvers/transaction.resolver'
import consumptionPerDayResolver from './resolvers/per-day.resolver'

const schemaComposer = new SchemaComposer()

const BlockTypeTC = schemaComposer.createObjectTC({
  name: 'Block',
  fields: {
    hash: 'String!',
    size: 'Int!',
    consumedEnergy: 'Float!'
  }
})

const TxTypeTC = schemaComposer.createObjectTC({
  name: 'Transaction',
  fields: {
    hash: 'String!',
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

schemaComposer.Query.addFields({
  EnergyByBlock: {
    type: BlockTypeTC,
    args: { blockHash: 'String!' },
    resolve: blockByHashResolver
  },
  EnergyByTransaction: {
    type: TxTypeTC,
    args: { txHash: 'String!' },
    resolve: transactionByHashResolver
  },
  ConsumptionPerDay: {
    type: [PerDayTypeTC],
    args: { numDays: 'Int!' },
    resolve: consumptionPerDayResolver
  }
})

export const schema = schemaComposer.buildSchema()
