import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { Transformer, Generator, Parser } from '../src';

// const transformer = new Transformer(
//   readFileSync(resolve(__dirname, 'a.ts'), { encoding: 'UTF8' }),
//   __dirname
// );
// const gen = new Generator(transformer.getResult());
// const result = gen.gen();
// writeFileSync(resolve(__dirname, 'result1.txt'), result, { encoding: 'UTF8' });
// console.log(result);

// import 

const parser = new Parser(
  readFileSync(resolve(__dirname, 'result1.txt'), { encoding: 'UTF8' }),
  'zh-CN'
);