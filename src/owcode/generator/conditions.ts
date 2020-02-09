import { Condition } from "../ast/conditions";
import { expressionToCode } from "./actions";
import { matchSymbolToString } from "./matchSymbolToString";

export function conditionToCode(cond: Condition): string {
  return [
    expressionToCode(cond.left),
    matchSymbolToString(cond.symbol),
    expressionToCode(cond.right)
  ].join(' ');
}