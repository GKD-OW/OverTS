import * as ts from 'typescript';
import { DefinedContants } from './var';

interface CanToString {
  toString(): string;
}
export class PropertyAccess implements CanToString {
  public left: CanToString;
  public right: CanToString;
  constructor(left: CanToString, right: CanToString) {
    this.left = left;
    this.right = right;
  }

  toString() {
    return `${this.left.toString()}.${this.right.toString()}`;
  }
}
export class TextAccess implements CanToString {
  text: string;
  constructor(text: string) {
    this.text = text;
  }
  toString() {
    return this.text;
  }
}
export function isCanToString(obj: any): obj is CanToString {
  return obj && (obj instanceof PropertyAccess || obj instanceof TextAccess);
}
/**
 * 获取最终访问的是谁
 * @param exp 
 * @param defines 
 */
export function getFinalAccess(exp: ts.Node, defines?: DefinedContants): ts.Expression | CanToString {
  if (ts.isIdentifier(exp)) {
    if (defines && typeof(defines[exp.text]) !== 'undefined') {
      return getFinalAccess(defines[exp.text], defines);
    } else {
      return new TextAccess(exp.text);
    }
  }
  if (ts.isStringLiteral(exp)) {
    return new TextAccess(exp.text);
  }
  if (ts.isPropertyAccessExpression(exp) && ts.isIdentifier(exp.name)) {
    return new PropertyAccess(getFinalAccess(exp.expression, defines), new TextAccess(exp.name.text));
  }
  // 数组形式的对象访问，但不处理下标是数字的情况
  if (ts.isElementAccessExpression(exp) && !ts.isNumericLiteral(exp.argumentExpression)) {
    return new PropertyAccess(getFinalAccess(exp.expression, defines), getFinalAccess(exp.argumentExpression, defines));
  }
  return exp;
}