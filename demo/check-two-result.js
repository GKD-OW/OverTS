const { readFileSync } = require('fs');
const { resolve } = require('path');

const one = readFileSync(resolve(__dirname, 'result1.txt'), {
  encoding: 'UTF-8'
});
const two = readFileSync(resolve(__dirname, 'result2.txt'), {
  encoding: 'UTF-8'
});

if (one !== two) {
  console.error('Results is NOT same!');
  process.exit(1);
}
console.log('Results is same');