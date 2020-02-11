import { Condition } from "../ast/conditions";
import { expressionToCode } from "./actions";
import { compareSymbolToString } from "./compareSymbolToString";

type varMap = { [x: string]: string };

export function conditionToCode(global: varMap, player: varMap, cond: Condition): string {
  return [
    expressionToCode(global, player, cond.left),
    compareSymbolToString(cond.symbol),
    expressionToCode(global, player, cond.right)
  ].join(' ');
}