import * as ts from 'typescript';

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