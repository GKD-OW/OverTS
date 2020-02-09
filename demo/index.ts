import parse from '../src';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import to from '../src/owcode/generator';
// import { Events } from '../src/owcode/type/event';

const ast = parse(readFileSync(resolve(__dirname, 'a.ts'), { encoding: 'UTF8' }));
const result = to(ast);
writeFileSync(resolve(__dirname, 'result.txt'), result, { encoding: 'UTF8' });

// console.log(to({
//   variable: {
//     global: ['AAA', 'BBB'],
//     player: ['CCC', 'DDD']
//   },
//   rules: [
//     {
//       name: '规则1',
//       event: {
//         name: Events.GLOBAL_ONGOING
//       },
//       conditions: [],
//       actions: []
//     }
//   ]
// }));