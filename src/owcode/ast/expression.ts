import { CompareSymbol } from "../type/compare";

export enum ExpressionKind {
  CALL,
  CONSTANT,
  COMPARE_SYMBOL,
  NUMBER,
  BOOLEAN,
  STRING,
  RAW
}

export interface OWExpression {
  kind: ExpressionKind;
  text: string;
}

export interface CallExpression extends OWExpression {
  kind: ExpressionKind.CALL,
  arguments?: OWExpression[];
}

export function isCallExpression(obj: any): obj is CallExpression {
  return obj && obj.kind === ExpressionKind.CALL;
}

export interface CompareExpression extends OWExpression {
  kind: ExpressionKind.COMPARE_SYMBOL,
  compare: CompareSymbol;
}

export function isMatchExpression(obj: any): obj is CompareExpression {
  return obj && obj.kind === ExpressionKind.COMPARE_SYMBOL;
}