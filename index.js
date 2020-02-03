const LRU = require('lru-cache')

module.exports = ({ maxAge, onupdate, ...rest }) => {
  // Use lru-cache as it removes the cached values least used
  const cache = new LRU({ ...rest })

  return async ({ key, params }) => {
    const isCached = cache.has(key) && cache.peek(key).value !== undefined
    const isUpdating = cache.has(key) && cache.peek(key).isUpdating
    const isStale = isCached && cache.peek(key).staleTime < Date.now()

    // Is not in cache
    if (!isCached && !isUpdating) {
      cache.set(key, {
        onupdate: []
      })

      return updateCache({ key, params })
    }

    if (!isCached && isUpdating) return new Promise(resolve => cache.peek(key).onupdate.push(resolve))

    // Is in cache, and not stale
    if (!isStale) return cache.get(key).value

    // Is in cache and stale
    if (!isUpdating) updateCache({ key, params })

    return cache.get(key).value // return dirty value
  }

  async function updateCache ({ key, params }) {
    const cachedItem = cache.peek(key)
    cachedItem.isUpdating = true

    const value = await onupdate(params)
    const onupdateCalls = cachedItem.onupdate
    cachedItem.value = value
    cachedItem.onupdate = []
    cachedItem.isUpdating = false
    cachedItem.staleTime = Date.now() + maxAge

    // Call the other onupdate after this one has returned.
    // It guarantees the same order as the cacher was called
    process.nextTick(() => onupdateCalls.forEach(fn => fn(value)))

    return value
  }
}
