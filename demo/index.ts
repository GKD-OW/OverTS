import Transformer from '../src';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import Generator from '../src/owcode/generator';
// import { ExpressionKind, IfExpression, CallExpression } from '../src/owcode/ast/expression';
// import { Events } from '../src/owcode/type/event';

const transformer = new Transformer(readFileSync(resolve(__dirname, 'a.ts'), { encoding: 'UTF8' }));
/*
const waitOne: CallExpression = {
  kind: ExpressionKind.CALL,
  text: 'WAIT',
  arguments: [{
    kind: ExpressionKind.NUMBER,
    text: "1"
  }]
};
const ifExpression: IfExpression = {
  kind: ExpressionKind.IF,
  text: "",
  condition: {
    kind: ExpressionKind.BOOLEAN,
    text: 'TRUE'
  },
  then: [waitOne, waitOne],
  elseIf: undefined,
  elseThen: [waitOne]
}
const gen = new Generator({
  variable: {
    global: [],
    player: []
  },
  sub: {},
  rules: [
    {
      name: 'test',
      event: {
        kind: 'GLOBAL',
      },
      conditions: [],
      actions: [ifExpression]
    }
  ]
});
*/
const gen = new Generator(transformer.getResult());
const result = gen.gen();
// writeFileSync(resolve(__dirname, 'result.txt'), result, { encoding: 'UTF8' });
console.log(result);