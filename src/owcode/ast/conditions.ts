import { MatchSymbol } from "../type/match";
import { OWExpression } from "./expression";

export interface Condition {
  left: OWExpression;
  symbol: MatchSymbol;
  right: OWExpression;
}