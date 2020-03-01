import '../helper';
import * as ts from 'typescript';

export const CompareSymbolStrings: { [x: number]: string } = {
  [CompareSymbol.EQUALS]: '==',
  [CompareSymbol.GREATER]: '>',
  [CompareSymbol.GREATER_EQUALS]: '>=',
  [CompareSymbol.LESS]: '<',
  [CompareSymbol.LESS_EQUALS]: '<=',
  [CompareSymbol.NOT_EQUALS]: '!=',
}

export const CompareSymbolNames: { [x: number]: string } = {
  [CompareSymbol.EQUALS]: 'EQUALS',
  [CompareSymbol.GREATER]: 'GREATER',
  [CompareSymbol.GREATER_EQUALS]: 'GREATER_EQUALS',
  [CompareSymbol.LESS]: 'LESS',
  [CompareSymbol.LESS_EQUALS]: 'LESS_EQUALS',
  [CompareSymbol.NOT_EQUALS]: 'NOT_EQUALS'
}

export const mapTsToCompare: { [x: number]: CompareSymbol } = {
  [ts.SyntaxKind.EqualsEqualsEqualsToken]: CompareSymbol.EQUALS,
  [ts.SyntaxKind.EqualsEqualsToken]: CompareSymbol.EQUALS,
  [ts.SyntaxKind.LessThanToken]: CompareSymbol.LESS,
  [ts.SyntaxKind.LessThanEqualsToken]: CompareSymbol.LESS_EQUALS,
  [ts.SyntaxKind.GreaterThanToken]: CompareSymbol.GREATER,
  [ts.SyntaxKind.GreaterThanEqualsToken]: CompareSymbol.GREATER_EQUALS,
  [ts.SyntaxKind.ExclamationEqualsEqualsToken]: CompareSymbol.NOT_EQUALS,
  [ts.SyntaxKind.ExclamationEqualsToken]: CompareSymbol.NOT_EQUALS,
}

export const mapCompareToTs: { [x: number]: ts.BinaryOperator } = {
  [CompareSymbol.EQUALS]: ts.SyntaxKind.EqualsEqualsEqualsToken,
  [CompareSymbol.LESS]: ts.SyntaxKind.LessThanToken,
  [CompareSymbol.LESS_EQUALS]: ts.SyntaxKind.LessThanEqualsToken,
  [CompareSymbol.GREATER]: ts.SyntaxKind.GreaterThanToken,
  [CompareSymbol.GREATER_EQUALS]: ts.SyntaxKind.GreaterThanEqualsToken,
  [CompareSymbol.NOT_EQUALS]: ts.SyntaxKind.ExclamationEqualsEqualsToken
}