var async = require('async')
var _ = require('lodash')
var Q = require('q')
var traverse = require('traverse')


module.exports = EncryptedConfig

/**
 * @param {object}   data
 * @param {Function} decrypt
 * @param {object=}  opts
 * @constructor
 */
function EncryptedConfig(data, decrypt, opts) {
  this.data = data
  this.decrypt = decrypt

  opts = opts || {}
  this.opts = _.defaults(opts, EncryptedConfig.DEFAULT_OPTS)

  this.plaintextConfig = null
  this.decryptingDeferred = null
}

/**
 * @param  {object}   data
 * @param  {Function} decrypt
 * @param  {object=}  opts
 * @return {EncryptedConfig}
 * @static
 */
EncryptedConfig.create = function (data, decrypt, opts) {
  return new EncryptedConfig(data, decrypt, opts)
}

EncryptedConfig.DEFAULT_OPTS = {
  prefix: '_'
}

/**
 * @return {Q.Promise}
 */
EncryptedConfig.prototype.read = function () {
  if (this.plaintextConfig)    return Q(this.plaintextConfig)
  if (this.decryptingDeferred) return this.decryptingDeferred.promise

  return this._decryptConfiguration()
}


/**
 * @param  {string} path
 * @return {Q.Promise}
 */
EncryptedConfig.prototype.readPath = function (path) {
  return this.read().then(function (config) {
    return traverse(config).get(path.split('.'))
  })
}


/**
 * @return {Q.Promise}
 * @private
 */
EncryptedConfig.prototype._decryptConfiguration = function () {
  var self = this

  if (this.decryptingDeferred) {
    return this.decryptingDeferred.promise
  }

  this.isDecryptingNow = true
  var deferred = Q.defer()
  this.decryptingDeferred = deferred

  this._buildDecryptionMap().then(function (decryptionMap) {
    var mutableConfig = traverse(self.data).clone()

    traverse(mutableConfig).forEach(function (value) {
      // Context set by the traverse module https://github.com/substack/js-traverse#context
      var key = this.key

      if (! self._isEncryptionPrefixedKey(key)) return

      // swap out encrypted values and remove prefixes
      var normalizedKey = self._removeEncryptionPrefix(key)
      var plaintextValue = decryptionMap[value]
      this.delete()
      this.parent.node[normalizedKey] = plaintextValue
    })

    self.plaintextConfig = mutableConfig
    delete self.decryptingDeferred

    return mutableConfig
  })
  .then(deferred.resolve.bind(deferred))
  .catch(deferred.reject.bind(deferred))

  return deferred.promise
}

/**
 * @return {Q.Promise}
 * @private
 */
EncryptedConfig.prototype._buildDecryptionMap = function (encryptedValues) {
  var deferred = Q.defer()

  var decrypt = this.decrypt
  var map = Object.create(null)

  async.each(this._pluckEncryptedValues(), function (val, callback) {
    decrypt(val, function (err, decryptedValue) {
      if (err) return callback(err)

      map[val] = decryptedValue
      callback()
    })
  }, function (err) {
    if (err) return deferred.reject(err)

    deferred.resolve(map)
  })

  return deferred.promise
}

/**
 * @return {Boolean}
 * @private
 */
EncryptedConfig.prototype._isEncryptionPrefixedKey = function (key) {
  if (typeof key !== 'string') return false

  return key.slice(0, this.opts.prefix.length) === this.opts.prefix
}

/**
 * @param  {string} key
 * @return {string}
 * @private
 */
EncryptedConfig.prototype._removeEncryptionPrefix = function (key) {
  return key.slice(this.opts.prefix.length)
}

/**
 * @return {object}
 * @private
 */
EncryptedConfig.prototype._pluckEncryptedValues = function () {
  var self = this

  return traverse(this.data).reduce(function (memo, val) {
    // Context set by the traverse module https://github.com/substack/js-traverse#context
    var key = this.key
    if (! self._isEncryptionPrefixedKey(key)) return memo

    if (_.contains(memo, val)) return memo
    memo.push(val)
    return memo
  }, [])
}
