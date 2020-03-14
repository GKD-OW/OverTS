import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { Transformer, OWGenerator, OWParser, OWTransformer } from '../src';

// const transformer = new Transformer(
//   readFileSync(resolve(__dirname, 'a.ts'), { encoding: 'UTF8' }),
//   __dirname
// );
// transformer.getResult()
// const result = OWGenerator(transformer.getResult());
// writeFileSync(resolve(__dirname, 'result1.txt'), result, { encoding: 'UTF8' });
// console.log(result);

// import 


// import Types from '../src/owcode/parser/types';
// import { parseExpression } from '../src/owcode/parser/parser';
// import { ExpressionKind } from '../src/owcode/share/ast/expression';
// const func = Types.getFunctionType('getCurrentHero');
// console.log(parseExpression("End", [{
//   kind: ExpressionKind.CONSTANT,
//   isAny: true
// }]));

const ast = OWParser(
  readFileSync(resolve(__dirname, 'result1.txt'), { encoding: 'UTF8' }),
  'zh-CN'
);
const result = OWGenerator(ast, {
  uglify: true
});
console.log(result);
// console.dir(ast, {
//   depth: 8
// });
// console.log(new OWTransformer(ast).genText());