import "../helper";
import { OWExpression } from "./expression";

export interface Condition {
  left: OWExpression;
  symbol: CompareSymbol;
  right: OWExpression;
}