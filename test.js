const test = require('tape')
const SRWCache = require('./')

const MAX_AGE = 1 * 1000 // 1 second
const STALE_WHILE_REVALIDATE = 5 * 1000 // 5 seconds
const TIME_TO_VALIDATE = 1 * 1000 // 1 second

const key = 'foobar'
const params = { hello: 'world' }
const get = SRWCache({
  maxAge: MAX_AGE,
  staleWhileRevalidate: STALE_WHILE_REVALIDATE,
  validate: async params => {
    await new Promise(resolve => setTimeout(resolve, TIME_TO_VALIDATE))
    return {
      n: 42
    }
  }
})

test('First hit', async t => {
  t.plan(2)

  const start = Date.now()
  const value = await get(key, params)
  const time = Date.now() - start

  t.ok(time > 500, 'First hit takes more than 500ms to complete')
  t.equals(value.n, 42, 'Cache has correct stored value')
})

test('Second hit - from cache', async t => {
  t.plan(2)

  const start = Date.now()
  const value = await get(key, params)
  const time = Date.now() - start

  t.ok(time < 50, 'Second hit is from cache and takes less than 50ms to complete')
  t.equals(value.n, 42, 'Cache has correct stored value')
})

test('Third hit - Is stale, but quickly returned', async t => {
  t.plan(2)

  await new Promise(resolve => setTimeout(resolve, MAX_AGE + 100)) // Wait MAX_AGE plus 100 ms

  const start = Date.now()
  const value = await get(key, params)
  const time = Date.now() - start

  t.ok(time < 50, 'Third hit is stale, but from cache, and takes less than 50ms to complete')
  t.equals(value.n, 42, 'Cache has correct stored value')
})

test('Fourth hit - Is stale, and too old to validate. Cache should not be used, and then take more than 500ms to complete', async t => {
  t.plan(2)

  await new Promise(resolve => setTimeout(resolve, MAX_AGE + STALE_WHILE_REVALIDATE + TIME_TO_VALIDATE + 100)) // Wait MAX_AGE + STALE_WHILE_REVALIDATE + TIME_TO_VALIDATE plus 100 ms

  const start = Date.now()
  const value = await get(key, params)
  const time = Date.now() - start

  t.ok(time > 500, 'Fourth hit is stale and too old to validate, so should take more than 500ms to complete')
  t.equals(value.n, 42, 'Cache has correct stored value')
})
