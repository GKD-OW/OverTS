import { MatchSymbol } from "../type";

export function matchSymbolToString(symbol: MatchSymbol): string {
  switch (symbol) {
    case MatchSymbol.EQUALS:
      return '=='
  }
}