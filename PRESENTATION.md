# Requirements and assumptions

Holds assumptions and requirements to be refined.

## FR - clarification questions

- How many days in the back we want to look? It's a very heavy operation, can't be realtime.
- Is it a must to be able to query by block hash and block idx? Caching will be trickier if allow both.\
  Can we only allow search by block hash?
- Are we going to support date range selection or just X days from the past?
- Transaction might be confirmed or cancelled, we still report energy consumption, correct?
- We could use concurrent requests with Promise.all(), but there is a risk the whole package will crash.
  We could use Promise.allSettled() and either ignore failed responses, or retry them separately.
  How tolerate are we to the data accuracy?
- What's the expected load / usage? How many concurrent users?
- PRIMARY question (after exploring the API and first naïve approach / Spike):
  Does it all have to be realtime and synchronous. What about wallet transaction for a very active wallet with many transactions?
  We don't know which wallet will be requested, so we can't pre-cache.
  Could we make this information received as a "Task", and e.g. implement WebSocket to update UI later?
- Public API is very limited; we either need the token to go up to 100RPS, that will cost some money, or we need to check another data provider.

### Thoughts

- If we stick to bitcoin.info API, we are very constrained and architecture becomes very complex
- Discuss the UI behavior to see how we should design the API contract; e.g. - lazy loading or load if requested.
  E.g. user might need to press the "Load more" button in UI to load next page of transactions for the wallet, or load next day.
- Use AI to see what other alternative options exist
- Probe Bitquery explorer
- Use bitquery.io GQL api (https://ide.bitquery.io), e.g. https://ide.bitquery.io:

  ```graphql
  query ($network: BitcoinNetwork!, $timeFormat: String!) {
    bitcoin(network: $network) {
      blocks {
        blockHash
        blockSize
        timestamp(time: {since: "2026-01-28"}) {
          time(format: $timeFormat)
        }
      }
    }
  }
  ```

  Gives us what we need, and is very flexible in terms of querying + very fast
  Example output:
  
  ```json
  {
    "blockHash": "00000000000000000001f22723b2f03ead54d1eebe17d0f2c320d82ec852be58",
    "blockSize": 1555512,
    "timestamp": {
      "time": "2026-01-28 13:38:16"
    }
  }
  ```

## NFR's

### Availability and resilience

- What is the SLA for availability (p95/p99)?
- Graceful error handling

### Performance

- What is SLA for response time / latency (p95/p99)?
- Prevent burst of traffic to upstream service (rate-limiting)

### Data quality and freshness

- Tolerance to the lost packages / data points
- Cached data (might be slightly inaccurate if not refreshed periodically)

### Security

- API key for protecting our internal API

### Observability

- Important data points are logged
- Collect metrics about response time and availability
- Collect metrics about the API performance (timeouts, latency, 429 errors)
- Cache hit ratio

# Architectural decisions

- Use centralized caching or storage for local cache to ensure fast response time and reducing external API calls.\
  It can be in-memory storage like Redis / Memcached, or NoSQL storage like MongoDb, or DynamoDB (since we are in AWS environment).
- We do not cache today's block data, since transactions haven't stopped yet
- Use got http client to have timeout and retires configured out of the box.\
  It's an advanced http agent for NodeJS projects.
- Getting real time data will be challenging or impossible without local cached versions.
  Since block data is not changing for the past days (very little chance it will change, actually - is it OKAY for us to ignore slight possible deviations?), we can have a long duration for the cache.
  We might want to implement background process which slowly populates the cache.
  If user asks for the data which is still not in the cache, we could return warning message that the data is incomplete.
- Create background process which will read blocks day after day for 30 days back (or how long is required).
  For each day block hashes put into queue and process at a tolerated rate in a batched requests with the waiting in between.
- IDEA: We could actually use queue to fan-out requests with different lambdas, each of those will have different IP address so we will get results faster...

# What else can be done?

- Integration tests with mocking upstream API (e.g. with 'nock' npm package)
- Unit tests for resolvers
- Advanced feature: consumptions by transactions within one wallet.
