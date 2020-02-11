export enum ExpressionKind {
  CALL,
  CONSTANT,
  MATCH_SYMBOL,
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