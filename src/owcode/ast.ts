import { CallExpression } from "./ast/expression";
import { Condition } from "./ast/conditions";
import { OWEvent } from "./ast/event";

export interface Rule {
  name: string;
  event: OWEvent;
  conditions: Condition[];
  actions: CallExpression[];
}

export interface Ast {
  variable: { // 变量定义区域
    global: string[]; // 全局变量
    player: string[]; // 玩家变量
  }
  rules: Rule[];
}