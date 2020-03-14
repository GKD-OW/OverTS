import { expect } from 'chai';
import { parseExpression, parseSimpleExpression } from '../../src/owcode/parser/parser';
import Types from '../../src/owcode/parser/types';
import { ExpressionKind } from '../../src/owcode/share/ast/expression';

// const modId = md5(resolve(DATA_DIR, 'b.ts'));
// const text = readData('index.txt').replace(/MOD_ID/g, modId);
// const expectAst = JSON.parse(readData('index.json').replace(/MOD_ID/g, modId));
describe("OWParser", function() {
  it("Get const types", function() {
    expect(Types.getConstType('GAME_CONTROL_SCORING_TEAM')).to.deep.equals({
      kind: ExpressionKind.CONSTANT,
      prefix: 'TEAM'
    });
  });
  it("Get function types", function() {
    const func = Types.getFunctionType('getCurrentHero');
    expect(func.returnType[0]).to.deep.equals({
      kind: ExpressionKind.CONSTANT,
      prefix: 'HERO'
    });
    expect(func.arguments[0]).to.deep.equals([{
      kind: ExpressionKind.CONSTANT,
      prefix: 'PLAYER'
    }]);
  });
  it("Parse constant", function() {
    const item = parseSimpleExpression("无", [{
      kind: ExpressionKind.CONSTANT,
      prefix: 'GAME_'
    }]);
    expect(item).to.deep.equals({
      kind: ExpressionKind.CONSTANT,
      text: 'GAME_NULL'
    });
  });
  it("Parse text function", function() {
    const item = parseExpression("所用英雄(事件玩家)", [{
      kind: ExpressionKind.CONSTANT,
      isAny: true
    }]);
    expect(item).to.deep.equals({
      kind: ExpressionKind.CALL,
      text: 'GET_CURRENT_HERO',
      arguments: [
        {
          kind: ExpressionKind.CONSTANT,
          text: 'GAME_EVENT_PLAYER'
        }
      ]
    });
  });
  // it("Parse full text", function() {
  //   const ast = OWParser(text, 'zh-CN');
  //   expect(ast).to.deep.equals(expectAst);
  // });
});