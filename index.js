const LRU = require('lru-cache')

module.exports = ({ maxAge, validate, staleWhileRevalidate, ...rest }) => {
  if (!maxAge) throw new Error('maxAge needs to be defined in stale-while-revalidate-lru-cache')
  if (!staleWhileRevalidate) throw new Error('staleWhileRevalidate needs to be defined in stale-while-revalidate-lru-cache')
  if (!validate) throw new Error('validate function needs to be defined in stale-while-revalidate-lru-cache')

  // Use lru-cache as it removes the cached values least used
  const cache = new LRU({ ...rest })

  return async ({ key, params }) => {
    const cachedItem = cache.has(key) && cache.peek(key)
    const isCached = cachedItem && cachedItem.value !== undefined
    const isValidating = cachedItem && cachedItem.isValidating
    const isStale = isCached && cachedItem.lastValidation + maxAge < Date.now()
    const isTooOldToReturn = isCached && ((cachedItem.lastValidation + maxAge + staleWhileRevalidate) < Date.now())

    // Is not in cache
    if (!isCached && !isValidating) {
      cache.set(key, {
        validate: []
      })

      return validateCache({ key, params })
    }
    if (!isCached && isValidating) return new Promise(resolve => cache.peek(key).validate.push(resolve))

    // Is in cache, and not stale
    if (!isStale) return cache.get(key).value

    // Is in cache, and is stale, but not older than staleWhileRevalidate, so cache can be returned
    if (!isTooOldToReturn) {
      if (!isValidating) validateCache({ key, params })

      return cache.get(key).value // return dirty value
    }

    // Is in cache, is stale, and older than staleWhileRevalidate, so validate cache, before returninga
    if (!isValidating) return validateCache({ key, params })

    return new Promise(resolve => cache.peek(key).validate.push(resolve))
  }

  async function validateCache ({ key, params }) {
    const cachedItem = cache.peek(key)
    cachedItem.isValidating = true

    const value = await validate(params)
    const validateCalls = cachedItem.validate
    cachedItem.value = value
    cachedItem.validate = []
    cachedItem.isValidating = false
    cachedItem.lastValidation = Date.now()

    // Call the other validate after this one has returned.
    // It guarantees the same order as the cacher was called
    process.nextTick(() => validateCalls.forEach(fn => fn(value)))

    return value
  }
}
