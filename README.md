# EncryptedConfig

[![Build Status](https://travis-ci.org/evansolomon/node-encrypted-config.svg?branch=master)](https://travis-ci.org/evansolomon/node-encrypted-config)

Safely store secrets in configuration objects.

`npm install encrypted-config`

## Basic usage

```js
var EncryptedConfig = require('encrypted-config')

// We'll use a not-so-secure encryption algorithm of reversing the string
var configWithSecrets = {
  // by default, keys of secret values are prefixed with an underscore
  // the prefix will be removed when the configuration is decrypted
  _band: 'traeH eht dna daeH ehT',
  $album: 'Let\'s Be Still',
  things: {
    sounds: {
      songs: {
        // deep nesting works
        _shake: 'yrd nar nep ym ni kni eht lleW',
        'homecoming heroes': 'So now I know'
      }
    }
  }
}

function decrypt(encryptedValue, callback) {
  // this should be a more secure system
  var plaintext = encryptedValue.split('').reverse().join('')

  // callback is (err, value), can be async
  setImmediate(callback.bind(null, null, plaintext))
}

var encryptedConfig = EncryptedConfig.create(configWithSecrets, decrypt)

// read values via promises
encryptedConfig.read().then(function (config) {
  // config is now our converted object with plaintext values and prefixes removed from
  // encrypted keys

  console.log(config.band)
  // 'The Head and the Heart'

  console.log(config.things.sounds.songs.shake)
  // 'Well the ink in my pen ran dry'
})

// read nested values
encryptedConfig.readPath('band').then(function (band) {
  console.log(band)
  // 'The Head and the Heart'
})

// no errors if values are not set
encryptedConfig.readPath('path.to.fake.data').then(function (data) {
  console.log(data)
  // undefined
})
```


## More realistic usage

A more reasonable usage would be to store data encrypted with something like [AWS's Key Management Service](https://aws.amazon.com/kms/).

```js
function decrypt(encryptedValue, callback) {
  var kms = new AWS.KMS()
  kms.decrypt({
    CiphertextBlob: new Buffer(encryptedValue, 'base64')
  }, function (err, result) {
    if (err) return callback(err)
    callback(null, result.Plaintext.toString())
  })
}

var encryptedConfig = EncryptedConfig.create(congigWithSecrets, decrypt)
encryptedConfig.read().then(function (config) {
  // all secrets in config have been decrypted via KMS
})
```

## Options

If you don't like underscores as your key prefix, pass `{prefix: 'whatever'}` as the third argument to `EncryptedConfig.create()`.
