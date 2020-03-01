import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { Transformer, OWGenerator, OWParser, OWTransformer } from '../src';

// const transformer = new Transformer(
//   readFileSync(resolve(__dirname, 'a.ts'), { encoding: 'UTF8' }),
//   __dirname
// );
// const result = OWGenerator(transformer.getResult());
// writeFileSync(resolve(__dirname, 'result1.txt'), result, { encoding: 'UTF8' });
// console.log(result);

// import 

const parser = OWParser(
  readFileSync(resolve(__dirname, 'result1.txt'), { encoding: 'UTF8' }),
  'zh-CN'
);
console.log(new OWTransformer(parser).genText());