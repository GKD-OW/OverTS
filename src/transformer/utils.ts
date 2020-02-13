import * as ts from "typescript";
import { v4 as uuidv4 } from 'uuid';
import Transformer from ".";
import { SubEvent } from "../owcode/ast/event";
import { CallExpression, CompareExpression, ExpressionKind, OWExpression } from "../owcode/ast/expression";
import { getFinalAccess, isCanToString, TextAccess } from "./accessUtils";
import { parseExpression } from "./expression";
import { DefinedContants, ParseContext } from "./var";

export function uuid() {
  return uuidv4().replace(/\-/g, '');
}

function deepParse(exp: ts.Node, defines?: DefinedContants): ts.Node {
  if (!defines) {
    return exp;
  }
  if (ts.isIdentifier(exp) && typeof(defines[exp.text]) !== 'undefined') {
    return deepParse(defines[exp.text], defines);
  }
  if (ts.isCallExpression(exp)) {
    const res = { ...exp };
    res.arguments = ts.createNodeArray(res.arguments.map(it => deepParse(it, defines)) as ts.Expression[]);
    return res;
  }
  if (ts.isBinaryExpression(exp)) {
    const res = { ...exp };
    res.left = deepParse(res.left, defines) as ts.Expression;
    res.right = deepParse(res.left, defines) as ts.Expression;
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
export function getVariable(this: Transformer, statements: ts.Statement[] | ts.NodeArray<ts.Statement>, defines?: DefinedContants) {
  const result: getVariableResult = {
    defines: {},
    variables: [],
    variableValues: {},
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
            result.defines[declaration.name.text] = deepParse(declaration.initializer, defines);
          } else {
            // 添加到变量声明
            result.variables.push(declaration.name.text);
            if (declaration.initializer) {
              result.variableValues[declaration.name.text] = parseExpression({
                transformer: this,
                defines: result.defines,
                vars: []
              }, declaration.initializer);
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
    throw new Error('仅支持一维数组');
  }
  const name = left.toString();
  if (!context.vars.includes(name)) {
    throw new Error(`找不到全局变量 ${name}`);
  }
  let indexExp: OWExpression | undefined = undefined;
  // 全局变量里面读取
  if (isCanToString(index)) {
    if (context.vars.includes(index.toString())) {
      indexExp = createCall('GLOBAL_VAR', createRaw(index.toString()));
    }
  } else {
    indexExp = parseExpression(context, index);
  }
  if (!indexExp) {
    throw new Error('无法识别数组访问');
  }
  return {
    name: createRaw(name),
    index: numberToRaw(indexExp)
  };
}
