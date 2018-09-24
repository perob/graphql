/**
 * Super simple base64 encoding / decoding with node.js
 * https://gist.github.com/indexzero/718390
 *
 * Note: String and numbers only.
 */

module.exports.base64 = {
  encode: (unencoded) => {
    return typeof unencoded === 'string'
      ? new Buffer(unencoded).toString('base64')
      : new Buffer(unencoded.toString()).toString('base64');
  },
  decode: (encoded) => {
    return new Buffer(encoded, 'base64').toString('utf8');
  }
};
