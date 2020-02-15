/**
 * Statement作为最基本的语句，检查是普通语句，还是特殊语句（如if这类）
 * 如果是特殊语句，则进行特殊语句解析，解析结果会是一个OWExpression，加入结果集
 * 如果是普通语句，则进行普通解析
 * * 如果返回多个OWExpression。则全部加入结果集
 * * 如果返回单个OWExpression。则加入结果集
 * * 否则忽略
 * 最后返回结果集
 * 
 * Expression解析规则
 * 如果是函数调用，则进入函数调用解析，否则直接返回普通解析结果。因此，结果可能是0-N条OWExpression。
 * 
 * CallExpression解析规则
 * 检查是否为常量调用，如果是：
 * * 如果常量只有单个内容，例如单条函数调用，则将它进行CallExpression解析，最终得到一条OWExpression。
 * * 如果常量是箭头函数，则将其中每一条都进行CallExpression解析，最终得到多条OWExpression
 * * 其他情况返回undefined
 * 否则，返回单条OWExpression
 * 接下来进行参数解析，依然是进入Expression解析。但不同的是，如果返回结果不是一条OWExpression，则提示错误
 * 最后返回完整的CallExpression
 */
import * as ts from 'typescript';
import { ActionExpression } from '../owcode/ast';
import { ExpressionKind, IfExpression, OWExpression, WhileExpression } from '../owcode/ast/expression';
import '../owcode/helper';
import { getFinalAccess, isCanToString, PropertyAccess, TextAccess } from './accessUtils';
import { simpleCalc, tryTinyCalc } from './calcParser';
import Constants from './constants';
import { conditionToBool, createCall, createCompareExpression, createConst, createRaw, createSubCall, getArrayAccess, getClassName, getMethod, parseCondition, tsMatchToCompare } from './utils';
import { ParseContext, TransformerError } from './var';

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
 * 解析函数调用Expression
 * @param context 
 * @param expression 
 */
function parseCallExpression(context: ParseContext, expression: ts.CallExpression): OWExpression | OWExpression[] | undefined {
  // 可能是常量，也可能是属性内的方法调用
  const finalExp = getFinalAccess(expression.expression, context.defines);
  // 如果遇到this调用，则进行子程序解析
  if (isCanToString(finalExp)) {
    if (finalExp instanceof PropertyAccess && !isCanToString(finalExp.left)) {
      const leftExp = finalExp.left as ts.Expression;
      if (leftExp.kind === ts.SyntaxKind.ThisKeyword) {
        if (!context.belongTo) {
          throw new Error("Can not access 'this'");
        }
        const subMethodName = finalExp.right.toString();
        const subName = getClassName(context.belongTo) + '_' + subMethodName;
        const subMethod = getMethod(context.belongTo, subMethodName);
        if (!subMethod) {
          throw new Error(`类 ${getClassName(context.belongTo)} 上不存在方法 ${subName}`);
        }
        if (!subMethod.body) {
          throw new Error(`方法 ${subName} 不能为空`);
        }
        context.transformer.parseSub(subName, subMethod.body);
        return createSubCall(subName);
      }
    } else {
      const callName = finalExp.toString();
      if (callName === '') {
        throw new Error('无法识别调用');
      }
      const args = parseArguments(context, expression.arguments);
      const funcName = callName.replace(/([A-Z])/g, '_$1').toUpperCase();
      // 特殊处理自定义字符串
      if (funcName === 'CUSTOM_STRING' && args[0].kind === ExpressionKind.RAW) {
        args[0].kind = ExpressionKind.STRING;
      }
      // 内置函数调用
      return createCall(funcName, ...args);
    }
  } else if (ts.isArrowFunction(finalExp)) {
    // 箭头函数调用
    const body = (finalExp as ts.ArrowFunction).body;
    if (body) {
      if (ts.isBlock(body)) {
        return ([] as OWExpression[]).concat(...body.statements.map(it => parseStatement(context, it)));
      } else {
        // 单条语句
        return parseExpression(context, body);
      }
    }
    return;
  } else if (ts.isFunctionExpression(finalExp)) {
    // 普通函数调用，作为子程序进行解析
    const func = finalExp as ts.FunctionExpression;
    // 作为子程序进行
    if (func.body) {
      const name = `sub_${func.pos}_${func.end}`;
      context.transformer.parseSub(name, func.body);
      return createSubCall(name);
    }
    return;
  } else if (ts.isFunctionDeclaration(finalExp)) {
    // 普通函数调用，作为子程序进行解析
    const func = finalExp as ts.FunctionDeclaration;
    // 作为子程序进行
    if (func.body) {
      const name = `sub_${func.pos}_${func.end}`;
      context.transformer.parseSub(name, func.body);
      return createSubCall(name);
    }
    return;
  }
  throw new Error('无法识别调用');
}

/**
 * 解析简单Expression，即除了函数调用之外的Expression
 * @param context 
 * @param expression 
 */
export function parseSimpleExpression(context: ParseContext, expression: ts.Expression): OWExpression {
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
      return parseSimpleExpression(context, name);
    }
  }
  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
    // 检查是否访问的内置对象
    const name = expression.expression.text;
    if (Constants.includes(name)) {
      return createConst(name.toUpperCase() + '_' + expression.name.text.toUpperCase());
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
  const parseSelfCalc = (exp: ts.PrefixUnaryExpression | ts.PostfixUnaryExpression) => {
    const symbol = simpleCalc[selfCalc[exp.operator]];
    if (!symbol) {
      throw new Error(`无法识别操作符 ${exp.operator}`);
    }
    const symbolExp = createConst(`OPERATION_${symbol}`);
    const num = {
      kind: ExpressionKind.NUMBER,
      text: "1"
    };
    // 可能有两种情况，一种是修改，一种是在索引处修改
    if (ts.isElementAccessExpression(exp.operand)) {
      const arrayAccess = getArrayAccess(context, exp.operand);
      return createCall('MODIFY_GLOBAL_VAR_AT_INDEX', arrayAccess.name, arrayAccess.index, symbolExp, num);
    }
    const nameExp = getFinalAccess(exp.operand);
    if (!isCanToString(nameExp)) {
      throw new Error('自运算符仅支持简单变量');
    }
    const name = nameExp.toString();
    if (!context.vars.includes(name)) {
      throw new Error(`找不到全局变量 ${name}`);
    }
    return createCall('MODIFY_GLOBAL_VAR', createRaw(name), symbolExp, num);
  };
  if (ts.isPrefixUnaryExpression(expression)) {
    // !x 取反运算
    if(expression.operator === ts.SyntaxKind.ExclamationToken) {
      return createCall('NOT', parseArgument(context, expression.operand));
    }
    // 自增、自减运算
    if (typeof(selfCalc[expression.operator]) !== 'undefined') {
      return parseSelfCalc(expression);
    }
  }
  if (ts.isPostfixUnaryExpression(expression)) {
    // 自增、自减运算
    if (typeof(selfCalc[expression.operator]) !== 'undefined') {
      return parseSelfCalc(expression);
    }
  }
  // 运算，转化为相应函数
  if (ts.isBinaryExpression(expression)) {
    const kind: ts.SyntaxKind = expression.operatorToken.kind;
    const tinyCalc = tryTinyCalc(expression);
    if (typeof(tinyCalc) !== 'undefined') {
      return {
        kind: ExpressionKind.NUMBER,
        text: tinyCalc.toString()
      };
    }
    // 赋值运算
    if (kind === ts.SyntaxKind.EqualsToken) {
      // 数组赋值和其他情况分开处理
      if (ts.isElementAccessExpression(expression.left)) {
        const arrayAccess = getArrayAccess(context, expression.left);
        return createCall(
          'SET_GLOBAL_VAR_AT_INDEX',
          arrayAccess.name,
          arrayAccess.index,
          parseArgument(context, expression.right)
        );
      } else {
        const left = getFinalAccess(expression.left);
        if (!(left instanceof TextAccess)) {
          throw new TransformerError('仅支持简单赋值', expression.left);
        }
        return createCall(
          'SET_GLOBAL_VAR',
          createRaw(left.toString()),
          parseArgument(context, expression.right)
        );
      }
    }
    // 普通运算 和 简单逻辑运算（与、或）
    if (typeof(simpleCalc[kind]) !== 'undefined') {
      return createCall(
        simpleCalc[kind],
        parseArgument(context, expression.left),
        parseArgument(context, expression.right)
      );
    }
    // 其他逻辑运算（大于、小于等）
    const logicSymbol = tsMatchToCompare(expression.operatorToken.kind);
    if (typeof(logicSymbol) !== 'undefined') {
      return createCall(
        'COMPARE',
        parseArgument(context, expression.left),
        createCompareExpression(logicSymbol),
        parseArgument(context, expression.right)
      );
    }
    // 运算后赋值
    if (typeof(calcAndSet[expression.operatorToken.kind]) !== 'undefined') {
      const symbol = simpleCalc[calcAndSet[expression.operatorToken.kind]];
      if (typeof(symbol) === 'undefined') {
        throw new Error(`无法识别操作符 ${expression.operatorToken.kind}`);
      }
      const symbolExp = createConst(`OPERATION_${symbol}`);
      const num = ts.isNumericLiteral(expression.right) ? {
        kind: ExpressionKind.NUMBER,
        text: expression.right.text
      }: parseArgument(context, expression.right);
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
  // 括号
  if (ts.isParenthesizedExpression(expression)) {
    return parseArgument(context, expression.expression);
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
  if (expression.kind === ts.SyntaxKind.NullKeyword || expression.kind === ts.SyntaxKind.UndefinedKeyword) {
    return createConst('GAME_NULL');
  }
  if (ts.isStringLiteral(expression)) {
    return {
      kind: ExpressionKind.RAW,
      text: expression.text
    }
  }
  // 不支持有元素的数组
  if (ts.isArrayLiteralExpression(expression)) {
    if (expression.elements.length > 0) {
      throw new Error('数组赋值仅支持空数组');
    }
    return createConst('GAME_EMPTY_ARRAY');
  }
  console.error(expression);
  throw new Error('无法识别表达式');
}


/**
 * 解析Expression，其中arguments是特殊的Expression存在形式
 * @param context 
 * @param exp 
 */
function parseExpression(context: ParseContext, exp: ts.Expression) {
  if (ts.isCallExpression(exp)) {
    return parseCallExpression(context, exp);
  } else {
    return parseSimpleExpression(context, exp);
  }
}

export function parseArgument(context: ParseContext, arg: ts.Expression) {
  if (ts.isCallExpression(arg)) {
    const result = parseCallExpression(context, arg);
    if (typeof(result) === 'undefined') {
      throw new TransformerError('参数不能为 undefined', arg);
    }
    if (Array.isArray(result)) {
      throw new TransformerError('参数不能有多个元素', arg);
    }
    return result;
  } else {
    return parseSimpleExpression(context, arg);
  }
}

export function parseArguments(context: ParseContext, args: ts.NodeArray<ts.Expression> | (ts.Expression[])) {
  if (Array.isArray(args)) return args.map(it => parseArgument(context, it));
  else return args.map(it => parseArgument(context, it));
}

/**
 * 解析Statement
 * @param context 
 * @param state 
 */
export function parseStatement(context: ParseContext, state?: ts.Statement) {
  let resultSet: ActionExpression[] = [];
  if (!state) {
    return resultSet;
  }
  // return
  if (ts.isReturnStatement(state)) {
    resultSet.push(createCall('ABORT'));
  }
  // if 表达式
  if (ts.isIfStatement(state)) {
    const newExp: IfExpression = {
      kind: ExpressionKind.IF,
      text: "",
      then: parseStatement(context, state.thenStatement),
      condition: conditionToBool(parseCondition(context, state.expression)),
      elseIf: undefined,
      elseThen: parseStatement(context, state.elseStatement)
    };
    resultSet.push(newExp);
  }
  // while
  if (ts.isWhileStatement(state)) {
    const newExp: WhileExpression = {
      kind: ExpressionKind.WHILE,
      text: "",
      then: parseStatement(context, state.statement),
      condition: conditionToBool(parseCondition(context, state.expression))
    };
    resultSet.push(newExp);
  }
  // 普通调用语句
  if (ts.isExpressionStatement(state)) {
    // 函数调用
    const result = parseExpression(context, state.expression);
    if (typeof(result) === 'undefined') {
      return resultSet;
    }
    if (Array.isArray(result)) {
      resultSet = resultSet.concat(result as ActionExpression[]);
    } else {
      resultSet.push(result as ActionExpression);
    }
  }
  // 多句调用
  if (ts.isBlock(state) && state.statements.length > 0) {
    resultSet = resultSet.concat(...state.statements.map(it => parseStatement(context, it)));
  }
  return resultSet;
}