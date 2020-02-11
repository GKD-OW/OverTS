import * as ts from 'typescript';

export enum CompareSymbol {
  EQUALS,
  LESS, // 小于
  LESS_EQUALS, // 小于或等于
  GREATER, // 大于
  GREATER_EQUALS, // 大于或等于
  NOT_EQUALS // 不等于
}

export function tsMatchToSymbol(kind: ts.SyntaxKind) {
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