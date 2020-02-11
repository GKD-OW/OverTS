import Transformer from '../src';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import to from '../src/owcode/generator';
// import { Events } from '../src/owcode/type/event';

const transformer = new Transformer(readFileSync(resolve(__dirname, 'a.ts'), { encoding: 'UTF8' }));
const result = to(transformer.getResult());
writeFileSync(resolve(__dirname, 'result.txt'), result, { encoding: 'UTF8' });
// console.log(result);