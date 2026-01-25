import { SchemaComposer } from 'graphql-compose'
import blockByHashResolver from './resolvers/block.resolver'
import consumptionPerDayResolver from './resolvers/per-day.resolver'

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
  }
})

export const schema = schemaComposer.buildSchema()
