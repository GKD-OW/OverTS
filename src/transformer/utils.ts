import * as ts from "typescript";
import { v4 as uuidv4 } from 'uuid';
import Transformer from ".";
import { OWExpression } from "../owcode/ast/expression";
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
    }
  });
  return result;
}

export function uuid() {
  return uuidv4().replace(/\-/g, '');
}