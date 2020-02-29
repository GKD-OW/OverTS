export enum ExpressionKind {
  CALL,
  CONSTANT,
  COMPARE_SYMBOL,
  NUMBER,
  BOOLEAN,
  STRING,
  RAW,
  IF,
  ELSEIF,
  WHILE
}

export type RecursiveExpression = IfExpression | ElseIfExpression | WhileExpression;

export interface OWExpression {
  kind: ExpressionKind;
  text: string;
}

export interface CallExpression extends OWExpression {
  kind: ExpressionKind.CALL,
  arguments: OWExpression[];
}
export function isCallExpression(obj: any): obj is CallExpression {
  return obj && obj.kind === ExpressionKind.CALL;
}

export interface CompareExpression extends OWExpression {
  kind: ExpressionKind.COMPARE_SYMBOL,
  compare: CompareSymbol;
}
export function isCompareExpression(obj: any): obj is CompareExpression {
  return obj && obj.kind === ExpressionKind.COMPARE_SYMBOL;
}

export interface ElseIfExpression extends OWExpression {
  kind: ExpressionKind.ELSEIF;
  condition: OWExpression;
  then: OWExpression[];
}
export function isElseIfExpression(obj: any): obj is ElseIfExpression {
  return obj && obj.kind === ExpressionKind.ELSEIF;
}

export interface IfExpression extends OWExpression {
  kind: ExpressionKind.IF;
  condition: OWExpression;
  then: OWExpression[];
  elseIf: ElseIfExpression[];
  elseThen: OWExpression[];
}
export function isIfExpression(obj: any): obj is IfExpression {
  return obj && obj.kind === ExpressionKind.IF;
}

export interface WhileExpression extends OWExpression {
  kind: ExpressionKind.WHILE;
  condition: OWExpression;
  then: OWExpression[];
}
export function isWhileExpression(obj: any): obj is IfExpression {
  return obj && obj.kind === ExpressionKind.WHILE;
}

// TODO: for循环