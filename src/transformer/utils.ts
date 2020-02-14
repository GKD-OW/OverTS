import * as ts from "typescript";
import { v4 as uuidv4 } from 'uuid';
import { Condition } from "../owcode/ast/conditions";
import { GlobalEvents, OWEvent, PlayerEvent, SubEvent, SubEvents } from "../owcode/ast/event";
import { CallExpression, CompareExpression, ExpressionKind, OWExpression } from "../owcode/ast/expression";
import { getFinalAccess, isCanToString, PropertyAccess, TextAccess } from "./accessUtils";
import { parseArgument } from "./parser";
import { DefinedContants, ParseContext, TransformerError } from "./var";

export function uuid() {
  return uuidv4().replace(/\-/g, '');
}

function deepParse(context: ParseContext, exp: ts.Node): ts.Node {
  if (!context.defines || Object.keys(context.defines).length === 0) {
    return exp;
  }
  if (ts.isIdentifier(exp) && typeof(context.defines[exp.text]) !== 'undefined') {
    return deepParse(context, context.defines[exp.text]);
  }
  if (ts.isCallExpression(exp)) {
    const res = { ...exp };
    res.arguments = ts.createNodeArray(res.arguments.map(it => deepParse(context, it)) as ts.Expression[]);
    return res;
  }
  if (ts.isBinaryExpression(exp)) {
    const res = { ...exp };
    res.left = deepParse(context, res.left) as ts.Expression;
    res.right = deepParse(context, res.right) as ts.Expression;
    return res;
  }
  return exp;
}

export interface getVariableResult {
  defines: DefinedContants;
  variables: string[];
  variableValues: { [x: string]: OWExpression };
}
/**
 * 从一连串的表达式中提取变量声明
 * @param this 
 * @param statements 
 * @param defines 
 */
export function getVariable(context: ParseContext, statements: ts.Statement[] | ts.NodeArray<ts.Statement>) {
  const result: getVariableResult = {
    defines: {},
    variables: [],
    variableValues: {},
  }
  const newContext = {
    ...context,
    defines: {
      ...context.defines
    }
  }
  statements.forEach(statement => {
    // 将所有全局变量的声明提取出来
    if (ts.isVariableStatement(statement)) {
      statement.declarationList.declarations.forEach(declaration => {
        if (ts.isIdentifier(declaration.name)) {
          if (statement.declarationList.flags === ts.NodeFlags.Const) {
            if (!declaration.initializer) {
              throw new Error(`宏 ${declaration.name.text} 必须有初始值`);
            }
            // 递归解析常量定义
            const it = deepParse(newContext, declaration.initializer);
            result.defines[declaration.name.text] = it;
            newContext.defines[declaration.name.text] = it;
          } else {
            // 添加到变量声明
            result.variables.push(declaration.name.text);
            if (declaration.initializer) {
              result.variableValues[declaration.name.text] = parseArgument(newContext, declaration.initializer);
            }
          }
        }
      });
      return;
    }
    // 另外，函数定义也作为const，提取出来
    if (ts.isFunctionDeclaration(statement)) {
      let name = "";
      if (statement.name && ts.isIdentifier(statement.name)) {
        name = statement.name.text;
      }
      // 忽略未命名的函数
      if (!name) {
        return;
      }
      // 忽略空函数
      if (!statement.body) {
        return;
      }
      // 剩下的才是有效函数
      result.defines[name] = statement;
    }
  });
  return result;
}


/**
 * 解析为规则的条件
 * @param context 
 * @param condition 
 */
export function parseCondition(context: ParseContext, condition: ts.Expression) {
  if (ts.isBinaryExpression(condition)) {
    const symbol = tsMatchToCompare(condition.operatorToken.kind);
    // 比较
    if (typeof(symbol) !== 'undefined') {
      return createCondition(parseArgument(context, condition.left), parseArgument(context, condition.right), symbol);
    }
    // 其他就不管了，扔到else的逻辑里面去
  }
  // 其他情况下，将左侧解析为OW表达式，右侧保持true
  return createCondition(parseArgument(context, condition));
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
    let teamName = 'TEAM_ALL';
    let heroName = 'GAME_ALL_HEROES';
    if (exps.length > 1) {
      const team = getFinalAccess(exps[1], defines);
      const hero = getFinalAccess(exps[2], defines);
      if (team instanceof PropertyAccess && team.left === 'Team') {
        teamName = 'TEAM_' + team.right.toString().toUpperCase();
      }
      if (hero instanceof PropertyAccess && hero.left === 'Hero') {
        heroName = 'HERO_' + hero.right.toString().toUpperCase();
      }
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

export function conditionToBool(condition: Condition): OWExpression {
  let conditionExp = {
    kind: ExpressionKind.BOOLEAN,
    text: 'FALSE'
  };
  if (condition.symbol === CompareSymbol.EQUALS) {
    if (condition.right.kind === ExpressionKind.BOOLEAN) {
      if (condition.right.text === 'TRUE') {
        conditionExp = condition.left;
      } else {
        conditionExp = createCall('NOT', condition.left);
      }
    } else {
      conditionExp = createCall('COMPARE', condition.left, createCompareExpression(condition.symbol),condition.right);
    }
  } else {
    conditionExp = createCall('COMPARE', condition.left, createCompareExpression(condition.symbol),condition.right);
  }
  return conditionExp;
}

/**
 * 创建子程序调用表达式
 * @param name 
 */
export function createSubCall(name: string): CallExpression {
  return createCall('CALL_SUBROUTINE', createRaw(name));
}

/**
 * 创建函数调用表达式
 * @param name 
 * @param args 
 */
export function createCall(name: string, ...args: OWExpression[]): CallExpression {
  return {
    kind: ExpressionKind.CALL,
    text: name,
    arguments: args
  };
}

/**
 * 创建条件表达式
 * @param left 
 * @param right 
 * @param symbol 
 */
export function createCondition(left: OWExpression, right: OWExpression = {
  kind: ExpressionKind.BOOLEAN,
  text: 'TRUE'
}, symbol: CompareSymbol = CompareSymbol.EQUALS) {
  return {
    left,
    symbol,
    right,
  }
}

/**
 * 创建子程序事件
 * @param name 
 */
export function createSubEvent(name: string): SubEvent {
  return {
    kind: Events.SUBROUTINE,
    sub: name
  };
}

/**
 * 创建比较表达式
 * @param compare 
 */
export function createCompareExpression(compare: CompareSymbol = CompareSymbol.EQUALS): CompareExpression {
  return {
    kind: ExpressionKind.COMPARE_SYMBOL,
    text: "",
    compare
  };
}

/**
 * 获取TS的类名称
 * @param clazz 
 */
export function getClassName(clazz: ts.ClassDeclaration) {
  if (clazz.name && ts.isIdentifier(clazz.name)) {
    return clazz.name.text;
  }
  return '';
}

/**
 * 从类中获取特定名称的方法定义
 * @param clazz 
 * @param name 
 */
export function getMethod(clazz: ts.ClassDeclaration, name: string) {
  for (const member of clazz.members) {
    if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name) && member.name.text === name) {
      return member;
    }
  }
}

/**
 * 将number类型的表达式转化为raw类型的表达式
 * @param exp 
 */
export function numberToRaw(exp: OWExpression): OWExpression {
  if (exp.kind !== ExpressionKind.NUMBER) {
    return exp;
  }
  return createRaw(parseInt(exp.text).toString());
}

/**
 * 创建const类型的表达式
 * @param text 
 */
export function createConst(text: string) {
  return {
    kind: ExpressionKind.CONSTANT,
    text
  }
}

/**
 * 创建raw类型的表达式
 * @param text 
 */
export function createRaw(text: string) {
  return {
    kind: ExpressionKind.RAW,
    text
  }
}

/**
 * 从TS的数组访问表达式中，获取访问详情
 * @param context 
 * @param exp 
 */
export function getArrayAccess(context: ParseContext, exp: ts.ElementAccessExpression) {
  const left = getFinalAccess(exp.expression, context.defines);
  const index = getFinalAccess(exp.argumentExpression, context.defines);
  if (!(left instanceof TextAccess)) {
    throw new TransformerError('仅支持一维数组', exp);
  }
  const name = left.toString();
  if (!context.vars.includes(name)) {
    throw new TransformerError(`找不到全局变量 ${name}`, exp);
  }
  let indexExp: OWExpression | undefined = undefined;
  // 全局变量里面读取
  if (isCanToString(index)) {
    if (context.vars.includes(index.toString())) {
      indexExp = createCall('GLOBAL_VAR', createRaw(index.toString()));
    }
  } else {
    indexExp = parseArgument(context, index);
  }
  if (!indexExp) {
    throw new TransformerError('无法识别数组访问', exp);
  }
  return {
    name: createRaw(name),
    index: numberToRaw(indexExp)
  };
}

export function tsMatchToCompare(kind: ts.SyntaxKind) {
  switch (kind) {
    case ts.SyntaxKind.EqualsEqualsToken:
    case ts.SyntaxKind.EqualsEqualsEqualsToken:
      return CompareSymbol.EQUALS;
    case ts.SyntaxKind.LessThanToken:
      return CompareSymbol.LESS;
    case ts.SyntaxKind.LessThanEqualsToken:
      return CompareSymbol.LESS_EQUALS;
    case ts.SyntaxKind.GreaterThanToken:
      return CompareSymbol.GREATER;
    case ts.SyntaxKind.GreaterThanEqualsToken:
      return CompareSymbol.GREATER_EQUALS;
    case ts.SyntaxKind.ExclamationEqualsToken:
    case ts.SyntaxKind.ExclamationEqualsEqualsToken:
      return CompareSymbol.NOT_EQUALS;
  }
}