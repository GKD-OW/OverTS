export function compareSymbolToString(symbol: CompareSymbol): string {
  switch (symbol) {
    case CompareSymbol.EQUALS:
      return '==';
    case CompareSymbol.GREATER:
      return '>';
    case CompareSymbol.GREATER_EQUALS:
      return '>=';
    case CompareSymbol.LESS:
      return '<';
    case CompareSymbol.LESS_EQUALS:
      return '<=';
    case CompareSymbol.NOT_EQUALS:
      return '!=';
  }
}