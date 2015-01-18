var assert = require('assert')
var EncryptedConfig = require('./')


describe('EncryptedConfig', function () {
  it('Should decrypt configuration object', function (done) {
    var conf = EncryptedConfig.create(configObj, reverseAsString)

    conf.read().then(function (config) {
      assert.strictEqual('The Head and the Heart', config.band, 'Encrypted value')
      assert.strictEqual('Let\'s Be Still', config.$album, 'Unencrypted value')
      assert.strictEqual('So now I know', config.things.sounds.songs['homecoming heroes'], 'Deep unencrypted value')
      assert.strictEqual('Well the ink in my pen ran dry', config.things.sounds.songs.shake, 'Deep unencrypted value')
      done()
    }).catch(done)
  })

  it('Should read object path', function (done) {
    var conf = EncryptedConfig.create(configObj, reverseAsString)
    conf.readPath('band').then(function (band) {
      assert.strictEqual('The Head and the Heart', band)
      done()
    }).catch(done)
  })

  it('Should not return undefined for non-existent path', function (done) {
    var conf = EncryptedConfig.create(configObj, reverseAsString)
    conf.readPath('fake.path').then(function (val) {
      assert.equal(undefined, val)
      done()
    }).catch(done)
  })

  it('Should use custom prefix', function (done) {
    var conf = EncryptedConfig.create(configObj, reverseAsString, {prefix: '$'})
    conf.read().then(function (config) {
      assert.strictEqual(config.album, 'llitS eB s\'teL', 'Encrypted string')
      done()
    }).catch(done)
  })

  it('Should handle parallel reads', function (done) {
    var finished = 0
    function check(config) {
      assert.strictEqual('The Head and the Heart', config.band, 'Encrypted string')

      finished++
      if (finished === 2) done()
    }

    var conf = EncryptedConfig.create(configObj, reverseAsString)
    conf.read().then(check).catch(done)
    conf.read().then(check).catch(done)
  })

  it('Should cache multiple reads', function (done) {
    var delay = 30
    var conf = EncryptedConfig.create(configObj, function (value, callback) {
      // slow it down
      setTimeout(callback.bind(null, null, value), delay)
    })

    var startedFirstReadAt = Date.now()
    conf.read().then(function (config) {
      var diff = Date.now() - startedFirstReadAt
      // roughly the right delay
      assert.ok(diff > (delay * .5) && diff < (delay * 1.5))

      var startedSecondReadAt = Date.now()
      conf.read().then(function () {
        var diff = Date.now() - startedSecondReadAt
        // much faster
        assert.ok(diff < (delay * .5))
        done()
      }).catch(done)
    }).catch(done)
  })
})


function reverseAsString(encrypted, callback) {
  setImmediate(function () {
    callback(null, encrypted.toString().split('').reverse().join(''))
  })
}

var configObj = {
  _band: 'traeH eht dna daeH ehT',
  $album: 'Let\'s Be Still',
  things: {
    sounds: {
      songs: {
        _shake: 'yrd nar nep ym ni kni eht lleW',
        'homecoming heroes': 'So now I know'
      }
    }
  }
}
