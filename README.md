# stale-while-revalidate-lru-cache

An LRU cache with a `maxAge` and a `staleWhileRevalidate`, that will return dirty/stale values if the cached values are older than `maxAge`. If they are older than `staleWhileRevalidate` then new values will be fetched before returned.

Follows the `stale-while-revalidate` scheme implemented in browsers, https://web.dev/stale-while-revalidate/.


`stale-while-revalidate-lru-cache` sits on top of `lru-cache`. Adds a way to update/revalidate stale items (items that are older than `maxAge`), but continue to return the cached value.

Its usage is when you are using `lru-cache` asynchronously and are ok with returning dirty/stale/old values.

Note: Does not contain a "set" method, but all "sets" are being done through the `validate` method.

## Installation

`$ npm i stale-while-revalidate-lru-cache`

## Usage

``` js
const SWRLRU = require('stale-while-revalidate-lru-cache')

// A cache that will contain some users.
// If the cache is older than a minute:
//   If it's less than an hour since last update/validation:
//     Return stale/dirty user, and `validate` in the background
//   If it's been more than an hour since last update/validation:
//     Wait for `validate` and then return
const users = SWRLRU({
  max: 30000, // Max 30,000 cached items
  maxAge: 60 * 1000, // one minute
  staleWhileRevalidate: 60 * 60 * 1000, // one hour
  validate: async params => {
    const username = params.username
    const token = params.token
    const user = await fetchUser({ username, token })

    return user
  }
})

const user = await users({
  key: 'MrFooBar',
  params: {
    username: 'MrFoobar'
  }
})
console.log(user) // This will not be printed until after validate/fetchUser is done feching the new user

setTimeout(async () => {
  const user = await users({
    key: 'MrFooBar',
    params: {
      username: 'MrFooBar',
      token: gotATokenFromSomewhere
    }
  })
  console.log(user) // This will be printed immediately, even though more than a minute has passed
}, 120 * 1000) // two minutes
```
