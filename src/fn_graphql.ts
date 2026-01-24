import { schema } from './schema.js'
import createAPI from 'lambda-api'
import { createHandler } from 'graphql-http'
import type { API, HandlerFunction } from 'lambda-api'
import type { GraphQLSchema } from 'graphql'
import { APIGatewayEvent, Context } from 'aws-lambda'
import { BlockchainExplorerService } from './services/blockchain-explorer.js'
import { CacheService } from './services/cache.js'

// Create cache service outside handler to persist across Lambda invocations
// Note: In development with serverless-offline's --reloadHandler flag,
// the module is reloaded on each request, so cache won't persist.
// Use 'yarn start:cached' to test cache persistence locally.
// In production Lambda, warm containers will preserve this module-level state.
const cacheService = new CacheService()

const services = {
  blockchainExplorer: new BlockchainExplorerService(cacheService)
}

export function APIGatewayLambda() {
  const isTest = process.env.NODE_ENV === 'test'
  const isOffline = process.env.IS_OFFLINE === 'true'

  return createAPI({
    version: 'v2',
    logger: isTest
      ? false
      : {
          level: isOffline ? 'debug' : 'info'
        }
  })
}

export const graphqlApi = /*#__PURE__*/ <TContext extends Record<string, unknown>>(
  schema: GraphQLSchema,  
  contextFactory?: () => Promise<TContext> | TContext
): HandlerFunction => {
  const handler = createHandler({
    schema,
    context: contextFactory
  })

  return async function graphqlHandler(req, res) {
    try {
      const [body, init] = await handler({
        url: req.path,
        method: req.method,
        headers: req.headers,
        body: () => Promise.resolve(req.body),
        raw: req,
        context: undefined
      })

      res.status(init.status)
      if (init.headers) {
        for (const [name, value] of Object.entries(init.headers)) {
          res.header(name, value)
        }
      }
      res.send(body)
    } catch (error) {
      req.log.error('GraphQL error:', String(error))
      res.error('Internal server error')
    }
  }
}

export function mkAPIGatewayHandler(api: API) {
  return async function apiGatewayHandler(event: APIGatewayEvent, ctx: Context) {
    return api.run(event, ctx)
  }
}

const api = APIGatewayLambda()

api.any(
  graphqlApi(schema, () => ({
    services: services
  }))
)

export const handler = mkAPIGatewayHandler(api)
