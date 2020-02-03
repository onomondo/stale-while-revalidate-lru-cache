# dirty-async-lru-cache

An LRU cache with a maxAge, that will return dirty/stale values, while new ones are being updated.

`dirty-async-lru-cache` sits on top of `lru-cache`. Adds a way to update stale items (items that are older than `maxAge`), but continue to return the cached value.

Its usage is when you are using `lru-cache` asynchronously and are ok with returning dirty/stale/old values.

Note: Does not contain a "set" method, but all "sets" are being done through the `onupdate` method.

## Installation

`$ npm i dirty-async-lru-cache`

## Usage

``` js
const LRU = require('dirty-async-lru-cache')

// A cache that will contain users.
// If the cache is older than a minute then a new user will be fetched, but the old stored
// user (dirty) will be returned at the same time without waiting for the `onupdate` to return
const users = LRU({
  max: 30000, // Max 30,000 cached items
  maxAge: 60 * 1000, // one minute
  onupdate: async params => {
    const username = params.username
    const user = await fetchUser({ username })

    return user
  }
})

const user = await users({ username: 'MrFoobar' })
console.log(user) // This will not be printed until after onupdate/fetchUser is done feching the new user

setTimeout(async () => {
  const user = await user({ username: 'MrFooBar' })
  console.log(user) // This will be printed immediately, even though more than a minute has passed
}, 120 * 1000) // two minutes
```
