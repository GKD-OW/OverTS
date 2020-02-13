import * as ts from 'typescript';
import { GlobalEvents, OWEvent, PlayerEvent, SubEvents } from '../owcode/ast/event';
import { CallExpression, ExpressionKind, OWExpression } from '../owcode/ast/expression';
import '../owcode/helper';
import { getFinalAccess, isCanToString, PropertyAccess } from './accessUtils';
import Constants from './constants';
import { createCall, createCompareExpression, createRaw, createSubCall, createSubEvent, getArrayAccess, tsMatchToCompare, uuid } from './utils';
import { DefinedContants, ParseContext } from './var';

// 普通算数运算符
const simpleCalc: { [x: number]: string } = {
  [ts.SyntaxKind.PlusToken]: 'ADD',
  [ts.SyntaxKind.MinusToken]: 'SUBTRACT',
  [ts.SyntaxKind.AsteriskToken]: 'MULTIPLY',
  [ts.SyntaxKind.SlashToken]: 'DIVIDE',
  [ts.SyntaxKind.PercentToken]: 'MODULO',
  [ts.SyntaxKind.AmpersandAmpersandToken]: 'AND',
  [ts.SyntaxKind.BarBarToken]: 'OR',
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
const selfCalc: { [x: number]: ts.SyntaxKind }  = {
  [ts.SyntaxKind.PlusPlusToken]: ts.SyntaxKind.PlusToken,
  [ts.SyntaxKind.MinusMinusToken]: ts.SyntaxKind.MinusToken,
}

/**
 * 将TS的调用符号表达式解析为OW表达式
 * @param context 
 * @param expression 
 */
function getCallExpression(context: ParseContext, expression: ts.CallExpression): CallExpression {
  // 可能是常量，也可能是属性内的方法调用
  const finalExp = getFinalAccess(expression.expression, context.defines);
  if (isCanToString(finalExp)) {
    const callName = finalExp.toString();
    if (callName === '') {
      throw new Error('无法识别调用');
    }
    // 内置函数调用
    return createCall(callName.replace(/([A-Z])/g, '_$1').toUpperCase(), ...expression.arguments.map(arg => parseExpression(context, arg)));
  } else {
    // 进到了这里的话，都算作子程序
    if (ts.isArrowFunction(finalExp) || ts.isFunctionDeclaration(finalExp)) {
      const body = (finalExp as ts.FunctionDeclaration).body;
      if (body) {
        const subName = "sub_" + uuid();
        context.transformer.parseSub(subName, body);
        return createSubCall(subName);
      }
    }
  }
  throw new Error('无法识别调用');
}

/**
 * 识别ts的表达式，将其转化为OWCode的表达式
 * @param context 
 * @param expression 
 */
export function parseExpression(context: ParseContext, expression: ts.Expression): OWExpression {
  if (ts.isCallExpression(expression)) {
    return getCallExpression(context, expression);
  }
  if (ts.isIdentifier(expression)) {
    // 普通字符，也可能是常量
    const name = getFinalAccess(expression, context.defines);
    if (isCanToString(name)) {
      const strName = name.toString();
      if (strName === "") {
        throw new Error(`常量 ${expression.text} 未定义`);
      }
      // 或者，也可能是全局变量
      if (context.vars.includes(strName)) {
        return createCall('GLOBAL_VAR', createRaw(strName));
      }
      throw new Error(`常量 ${strName} 未定义`);
    } else {
      return parseExpression(context, name);
    }
  }
  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
    // 检查是否访问的内置对象
    const name = expression.expression.text;
    if (Constants.includes(name)) {
      return {
        kind: ExpressionKind.CONSTANT,
        text: name.toUpperCase() + '_' + expression.name.text.toUpperCase()
      };
    }
  }
  // 访问数组
  if (ts.isElementAccessExpression(expression)) {
    const arrayAccess = getArrayAccess(context, expression);
    return createCall('VALUE_IN_ARRAY', createCall('GLOBAL_VAR', arrayAccess.name), arrayAccess.index);
  }
  // 纯数字
  if (ts.isNumericLiteral(expression)) {
    return {
      kind: ExpressionKind.NUMBER,
      text: expression.text
    };
  }
  if (ts.isPrefixUnaryExpression(expression)) {
    // !x 取反运算
    if(expression.operator === ts.SyntaxKind.ExclamationToken) {
      return createCall('NOT', parseExpression(context, expression.operand));
    }
  }
  if (ts.isPostfixUnaryExpression(expression)) {
    // 自增、自减运算
    if (typeof(selfCalc[expression.operator]) !== 'undefined') {
      const symbol = simpleCalc[selfCalc[expression.operator]];
      if (!symbol) {
        throw new Error(`无法识别操作符 ${expression.operator}`);
      }
      const symbolExp = {
        kind: ExpressionKind.CONSTANT,
        text: `OPERATION_${symbol}`
      };
      const num = {
        kind: ExpressionKind.NUMBER,
        text: "1"
      };
      // 可能有两种情况，一种是修改，一种是在索引处修改
      if (ts.isElementAccessExpression(expression.operand)) {
        const arrayAccess = getArrayAccess(context, expression.operand);
        return createCall('MODIFY_GLOBAL_VAR_AT_INDEX', arrayAccess.name, arrayAccess.index, symbolExp, num);
      }
      const nameExp = getFinalAccess(expression.operand);
      if (!isCanToString(nameExp)) {
        throw new Error('自运算符仅支持简单变量');
      }
      const name = nameExp.toString();
      if (!context.vars.includes(name)) {
        throw new Error(`找不到全局变量 ${name}`);
      }
      return createCall('MODIFY_GLOBAL_VAR', createRaw(name), symbolExp, num);
    }
  }
  // 运算，转化为相应函数
  if (ts.isBinaryExpression(expression)) {
    const kind: ts.SyntaxKind = expression.operatorToken.kind;
    // 赋值运算
    if (kind === ts.SyntaxKind.EqualsToken) {
      // 数组赋值和其他情况分开处理
      if (ts.isElementAccessExpression(expression.left)) {
        const arrayAccess = getArrayAccess(context, expression.left);
        return createCall(
          'SET_GLOBAL_VAR_AT_INDEX',
          arrayAccess.name,
          arrayAccess.index,
          parseExpression(context, expression.right)
        );
      } else {
        return createCall(
          'SET_GLOBAL_VAR',
          parseExpression(context, expression.left),
          parseExpression(context, expression.right)
        );
      }
    }
    // 普通运算 和 简单逻辑运算（与、或）
    if (typeof(simpleCalc[kind]) !== 'undefined') {
      return createCall(
        simpleCalc[kind],
        parseExpression(context, expression.left),
        parseExpression(context, expression.right)
      );
    }
    // 其他逻辑运算（大于、小于等）
    const logicSymbol = tsMatchToCompare(expression.operatorToken.kind);
    if (typeof(logicSymbol) !== 'undefined') {
      return createCall(
        'COMPARE',
        parseExpression(context, expression.left),
        createCompareExpression(logicSymbol),
        parseExpression(context, expression.right)
      );
    }
    // 运算后赋值
    if (typeof(calcAndSet[expression.operatorToken.kind]) !== 'undefined') {
      const symbol = simpleCalc[calcAndSet[expression.operatorToken.kind]];
      if (typeof(symbol) === 'undefined') {
        throw new Error(`无法识别操作符 ${expression.operatorToken.kind}`);
      }
      const symbolExp = {
        kind: ExpressionKind.CONSTANT,
        text: `OPERATION_${symbol}`
      };
      const num = ts.isNumericLiteral(expression.right) ? {
        kind: ExpressionKind.NUMBER,
        text: expression.right.text
      }: parseExpression(context, expression.right);
      // 可能有两种情况，一种是修改，一种是在索引处修改
      if (ts.isElementAccessExpression(expression.left)) {
        const arrayAccess = getArrayAccess(context, expression.left);
        return createCall('MODIFY_GLOBAL_VAR_AT_INDEX', arrayAccess.name, arrayAccess.index, symbolExp, num);
      }
      const nameExp = getFinalAccess(expression.left);
      if (!isCanToString(nameExp)) {
        throw new Error('自运算符仅支持简单变量');
      }
      const name = nameExp.toString();
      if (!context.vars.includes(name)) {
        throw new Error(`找不到全局变量 ${name}`);
      }
      return createCall('MODIFY_GLOBAL_VAR', createRaw(name), symbolExp, num);
    }
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
  // 不支持有元素的数组
  if (ts.isArrayLiteralExpression(expression)) {
    if (expression.elements.length > 0) {
      throw new Error('数组赋值仅支持空数组');
    }
    return {
      kind: ExpressionKind.CONSTANT,
      text: 'GAME_EMPTY_ARRAY'
    };
  }
  console.error(expression);
  throw new Error('无法识别表达式');
}

/**
 * 解析事件
 * @param exps 
 * @param defines 
 */
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
    let teamName = 'TEAM_ALL';
    let heroName = 'GAME_GET_ALL_HEROES';
    if (team instanceof PropertyAccess && team.left === 'Team') {
      teamName = 'TEAM_' + team.right.toString().toUpperCase();
    }
    if (hero instanceof PropertyAccess && hero.left === 'Hero') {
      heroName = 'HERO_' + hero.right.toString().toUpperCase();
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