import { Condition } from "./share/ast/conditions";
import { OWEvent } from "./share/ast/event";
import { CallExpression, IfExpression, WhileExpression } from "./share/ast/expression";

export type ActionExpression = CallExpression | IfExpression | WhileExpression;

export interface Rule {
  name: string;
  event: OWEvent;
  conditions: Condition[];
  actions: ActionExpression[];
}

export interface Ast {
  variable: { // 变量定义区域
    global: string[]; // 全局变量
    player: string[]; // 玩家变量
  }
  sub: { [x: string]: Rule };
  rules: Rule[];
}