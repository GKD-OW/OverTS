const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');
const Transformer = require('../lib').default;
const Generator = require('../lib/owcode/generator').default;

const transformer = new Transformer(
  readFileSync(resolve(__dirname, 'a.ts'), { encoding: 'UTF8' }),
  __dirname
);
const gen = new Generator(transformer.getResult());
const result = gen.gen();
writeFileSync(resolve(__dirname, 'result2.txt'), result, { encoding: 'UTF8' });
// console.log(result);