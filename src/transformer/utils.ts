import * as ts from "typescript";
import { CallExpression, ExpressionKind, OWExpression } from "../owcode/ast/expression";
import { parseExpression } from "./expression";
import { DefinedContants } from "./var";

function deepParse(exp: ts.Expression, defines?: DefinedContants): ts.Expression {
  if (!defines) {
    return exp;
  }
  if (ts.isIdentifier(exp) && typeof(defines[exp.text]) !== 'undefined') {
    return deepParse(defines[exp.text], defines);
  }
  if (ts.isCallExpression(exp)) {
    const res = { ...exp };
    res.arguments = ts.createNodeArray(res.arguments.map(it => deepParse(it, defines)));
    return res;
  }
  if (ts.isBinaryExpression(exp)) {
    const res = { ...exp };
    res.left = deepParse(res.left, defines);
    res.right = deepParse(res.left, defines);
    return res;
  }
  return exp;
}

interface getVariableResult {
  defines: DefinedContants;
  variables: string[];
  variableValues: { [x: string]: OWExpression };
}
export function getVariable(statements: ts.Statement[] | ts.NodeArray<ts.Statement>, defines?: DefinedContants) {
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
              result.variableValues[declaration.name.text] = parseExpression(declaration.initializer);
            }
          }
        }
      });
    }
  });
  return result;
}


export function getFinalText(exp: ts.Expression, defines?: DefinedContants): string {
  if (ts.isIdentifier(exp)) {
    if (defines && typeof(defines[exp.text]) !== 'undefined') {
      return getFinalText(defines[exp.text], defines);
    } else {
      return exp.text;
    }
  }
  if (ts.isStringLiteral(exp)) {
    return exp.text;
  }
  if (ts.isPropertyAccessExpression(exp)) {
    const leftName = getFinalText(exp.expression, defines);
    const rightName = getFinalText(exp.name, defines);
    return `${leftName}.${rightName}`;
  }
  return "";
}

export function createInitializer(vars: { [x: string]: OWExpression }) {
  const result: CallExpression[] = [];
  Object.keys(vars).forEach(name => {
    result.push({
      kind: ExpressionKind.CALL,
      text: 'SET_GLOBAL',
      arguments: [{
        kind: ExpressionKind.RAW,
        text: name
      }, vars[name]]
    });
  });
  return result;
}