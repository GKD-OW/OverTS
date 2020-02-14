import { CallExpression, IfExpression } from "./ast/expression";
import { Condition } from "./ast/conditions";
import { OWEvent } from "./ast/event";

type ActionExpression = CallExpression | IfExpression;

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