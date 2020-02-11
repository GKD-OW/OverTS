import * as ts from "typescript";
import { v4 as uuidv4 } from 'uuid';
import Transformer from ".";
import { CallExpression, ExpressionKind, OWExpression } from "../owcode/ast/expression";
import { CompareSymbol } from "../owcode/type/compare";
import { parseExpression } from "./expression";
import { DefinedContants } from "./var";

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
              result.variableValues[declaration.name.text] = parseExpression.call(this, declaration.initializer);
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

export function createSubCall(name: string): CallExpression {
  return createCall('CALL_SUB', {
    kind: ExpressionKind.RAW,
    text: name
  });
}

export function createCall(name: string, ...args: OWExpression[]): CallExpression {
  return {
    kind: ExpressionKind.CALL,
    text: name,
    arguments: args
  };
}

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

export function uuid() {
  return uuidv4().replace(/\-/g, '');
}

export function getClassName(clazz: ts.ClassDeclaration) {
  if (clazz.name && ts.isIdentifier(clazz.name)) {
    return clazz.name.text;
  }
  return '';
}

export function getMethod(clazz: ts.ClassDeclaration, name: string) {
  for (const member of clazz.members) {
    if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name) && member.name.text === name) {
      return member;
    }
  }
}