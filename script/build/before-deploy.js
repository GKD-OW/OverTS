const { resolve } = require('path');
const { writeFileSync } = require('fs');
const root = resolve(__dirname, '../..');

// 更新版本号
if (typeof(process.env['TRAVIS_TAG']) === 'undefined' || process.env['TRAVIS_TAG'] === '') {
  console.error('No tag name found');
  process.exit(1);
}
const package = require(resolve(root, 'package.json'));
package.version = process.env['TRAVIS_TAG'];
writeFileSync(resolve(root, 'package.json'), JSON.stringify(package), {
  encoding: 'UTF8'
});