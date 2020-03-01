module.exports = {
  require: [
    'ts-node/register',
    'source-map-support/register'
  ],
  reporter: 'mochawesome',
  recursive: true,
  'full-trace': true,
  bail: true
}