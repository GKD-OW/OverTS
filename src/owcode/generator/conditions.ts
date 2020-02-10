import { Condition } from "../ast/conditions";
import { expressionToCode } from "./actions";
import { matchSymbolToString } from "./matchSymbolToString";

type varMap = { [x: string]: string };

export function conditionToCode(global: varMap, player: varMap, cond: Condition): string {
  return [
    expressionToCode(global, player, cond.left),
    matchSymbolToString(cond.symbol),
    expressionToCode(global, player, cond.right)
  ].join(' ');
}