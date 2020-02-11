import { MatchSymbol } from "../type/match";

export function matchSymbolToString(symbol: MatchSymbol): string {
  switch (symbol) {
    case MatchSymbol.EQUALS:
      return '=='
  }
}