import * as ts from 'typescript';
import Transformer from '.';
import { ConstantNamespaces } from '../owcode/ast/constants';
import { GlobalEvents, OWEvent, PlayerEvent, SubEvent, SubEvents } from '../owcode/ast/event';
import { CallExpression, CompareExpression, ExpressionKind, OWExpression } from '../owcode/ast/expression';
import { CompareSymbol, tsMatchToSymbol } from '../owcode/type/compare';
import '../owcode/type/global';
import { getFinalAccess, isCanToString, PropertyAccess } from './accessUtils';
import { createCall, createSubCall, uuid } from './utils';
import { DefinedContants } from './var';

// 普通算数运算符
const simpleCalc: { [x: number]: string } = {
  [ts.SyntaxKind.PlusToken]: 'add',
  [ts.SyntaxKind.MinusToken]: 'subtract',
  [ts.SyntaxKind.AsteriskToken]: 'multiply',
  [ts.SyntaxKind.SlashToken]: 'divide',
  [ts.SyntaxKind.PercentToken]: 'modulo',
  [ts.SyntaxKind.AmpersandAmpersandToken]: 'and',
  [ts.SyntaxKind.BarBarToken]: 'or',
};
// 运算后赋值的运算符
const calcAndSet: { [x: number]: ts.SyntaxKind } = {
  [ts.SyntaxKind.PlusEqualsToken]: ts.SyntaxKind.PlusToken,
  [ts.SyntaxKind.MinusEqualsToken]: ts.SyntaxKind.MinusToken,
  [ts.SyntaxKind.AsteriskEqualsToken]: ts.SyntaxKind.AsteriskToken,
  [ts.SyntaxKind.SlashEqualsToken]: ts.SyntaxKind.SlashToken,
  [ts.SyntaxKind.PercentEqualsToken]: ts.SyntaxKind.PercentToken,
}
// 自运算符
const selfCalc = {
  [ts.SyntaxKind.PlusPlusToken]: ts.SyntaxKind.PlusToken,
  [ts.SyntaxKind.MinusMinusToken]: ts.SyntaxKind.MinusToken,
}

/**
 * 将TS的调用符号表达式解析为OW表达式
 * @param expression 
 * @param defines 
 * @param globalVariables 
 */
function getCallExpression(this: Transformer, expression: ts.CallExpression, defines: DefinedContants = {}, globalVariables: string[] = []): CallExpression {
  // 可能是常量，也可能是属性内的方法调用
  const finalExp = getFinalAccess(expression.expression, defines);
  if (isCanToString(finalExp)) {
    const callName = finalExp.toString();
    if (callName === '') {
      throw new Error('无法识别调用');
    }
    // 内置函数调用
    return createCall(callName.replace(/([A-Z])/g, '_$1').toUpperCase(), ...expression.arguments.map(arg => parseExpression.call(this, arg, defines, globalVariables)));
  } else {
    // 进到了这里的话，都算作子程序
    if (ts.isArrowFunction(finalExp) || ts.isFunctionDeclaration(finalExp)) {
      const body = (finalExp as ts.FunctionDeclaration).body;
      if (body) {
        const subName = "sub_" + uuid();
        this.parseSub(subName, body);
        return createSubCall(subName);
      }
    }
  }
  throw new Error('无法识别调用');
}

/**
 * 识别ts的表达式，将其转化为OWCode的表达式
 * @param expression 
 * @param defines 
 * @param globalVariables 
 */
export function parseExpression(this: Transformer, expression: ts.Expression, defines: DefinedContants = {}, globalVariables: string[] = []): OWExpression {
  if (ts.isCallExpression(expression)) {
    return getCallExpression.call(this, expression, defines, globalVariables);
  }
  if (ts.isIdentifier(expression)) {
    // 普通字符，也可能是常量
    const name = getFinalAccess(expression, defines);
    if (isCanToString(name)) {
      const strName = name.toString();
      if (strName === "") {
        throw new Error(`常量 ${expression.text} 未定义`);
      }
      // 或者，也可能是全局变量
      if (globalVariables.includes(strName)) {
        return createCall('GET_GLOBAL', {
          kind: ExpressionKind.RAW,
          text: strName
        });
      }
      throw new Error(`常量 ${strName} 未定义`);
    } else {
      return parseExpression.call(this, name);
    }
  }
  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
    // 检查是否访问的内置对象
    const name = expression.expression.text;
    if (ConstantNamespaces.includes(name)) {
      return {
        kind: ExpressionKind.CONSTANT,
        text: name.toUpperCase() + '_' + expression.name.text.replace(/([A-Z])/g, '_$1').toUpperCase()
      };
    }
  }
  if (ts.isNumericLiteral(expression)) {
    // 纯数字
    return {
      kind: ExpressionKind.NUMBER,
      text: expression.text
    };
  }
  // !x 取反运算
  if (ts.isPrefixUnaryExpression(expression)) {
    return createCall('NOT', parseExpression.call(this, expression.operand, defines, globalVariables));
  }
  // 运算，转化为相应函数
  if (ts.isBinaryExpression(expression)) {
    // 普通运算 和 简单逻辑运算（与、或）
    const kind: ts.SyntaxKind = expression.operatorToken.kind;
    if (typeof(simpleCalc[kind]) !== 'undefined') {
      return createCall(
        simpleCalc[kind].toUpperCase(),
        parseExpression.call(this, expression.left, defines, globalVariables),
        parseExpression.call(this, expression.right, defines, globalVariables)
      );
    }
    // 其他逻辑运算（大于、小于等）
    const logicSymbol = tsMatchToSymbol(expression.operatorToken.kind);
    if (typeof(logicSymbol) !== 'undefined') {
      return createCall(
        'COMPARE',
        parseExpression.call(this, expression.left, defines, globalVariables),
        createCompareExpression(logicSymbol),
        parseExpression.call(this, expression.right, defines, globalVariables)
      );
    }
    // TODO: 运算后赋值
    // if (typeof(CalcAndSet[expression.operatorToken.kind]) !== 'undefined') {
    //   const exp: CallExpression = {
    //     kind: ExpressionKind.CALL,
    //     text: getCalcFunc(expression.operatorToken.kind).toUpperCase(),
    //     arguments: [
    //       parseExpression(expression.left, defines, globalVariables),
    //       parseExpression(expression.right, defines, globalVariables)
    //     ]
    //   };
    //   return exp;
    // }
  }
  if (expression.kind === ts.SyntaxKind.FalseKeyword) {
    // false
    return {
      kind: ExpressionKind.BOOLEAN,
      text: 'FALSE'
    };
  }
  if (expression.kind === ts.SyntaxKind.TrueKeyword) {
    // true
    return {
      kind: ExpressionKind.BOOLEAN,
      text: 'TRUE'
    };
  }
  console.error(expression);
  throw new Error('无法识别表达式');
}

export function parseEvent(exps: ts.NodeArray<ts.Expression>, defines?: DefinedContants): OWEvent {
  const exp = exps[0];
  if (ts.isPropertyAccessExpression(exp)) {
    const finalExp = getFinalAccess(exp) as PropertyAccess;
    if (finalExp.left.toString() !== 'Events') {
      throw new Error('runAt只接受Events.*');
    }
    const right = finalExp.right.toString();
    // @ts-ignore
    if (typeof(Events[right]) === 'undefined') {
      throw new Error(`不存在 ${right} 事件`);
    }
    // @ts-ignore
    const eventName = Events[right];
    // 全局事件
    if (GlobalEvents.includes(eventName)) {
      const event: OWEvent = {
        kind: eventName
      }
      return event;
    }
    // 子程序
    if (SubEvents.includes(eventName)) {
      // TODO: 子程序名称
      return createSubEvent("");
    }
    // 玩家事件
    const team = getFinalAccess(exps[1], defines);
    const hero = getFinalAccess(exps[2], defines);
    let teamName = Team.ALL;
    let heroName = Heros.ALL;
    if (team instanceof PropertyAccess && team.left === 'Team') {
      // @ts-ignore
      teamName = Team[team.left];
    }
    if (hero instanceof PropertyAccess && hero.left === 'Heros') {
      // @ts-ignore
      heroName = Heros[hero.left];
    }
    const event: PlayerEvent = {
      kind: eventName,
      team: teamName,
      hero: heroName
    };
    return event;
  }
  throw new Error('事件无效');
}

export function createSubEvent(name: string): SubEvent {
  return {
    kind: Events.SUB,
    sub: name
  };
}

export function createCompareExpression(compare: CompareSymbol = CompareSymbol.EQUALS): CompareExpression {
  return {
    kind: ExpressionKind.COMPARE_SYMBOL,
    text: "",
    compare
  };
}