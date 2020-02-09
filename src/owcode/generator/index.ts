import { Ast } from "../ast";
import { expressionToCode } from "./actions";
import { conditionToCode } from "./conditions";
import { getEventText } from "./event";
import i18n from "./i18n";
import Result from "./result";

export default function(ast: Ast) {
  const result = new Result;
  // 变量区域
  if (ast.variable.global.length > 0 || ast.variable.player.length > 0) {
    result.push(i18n('G_VAR'));
    result.leftBrace();
    if (ast.variable.global.length > 0) {
      result.push(i18n('G_VAR_GLOBAL') + ':', 1);
      ast.variable.global.forEach((name, index) => {
        result.push(`${index}: ${name}`);
      });
      result.push('', -1);
    }
    if (ast.variable.player.length > 0) {
      result.push(i18n('G_VAR_PLAYER') + ':', 1);
      ast.variable.global.forEach((name, index) => {
        result.push(`${index}: ${name}`);
      });
      result.push('', -1);
    }
    result.rightBrace();
    result.push();
  }
  // 规则区域
  ast.rules.forEach(rule => {
    result.push(`${i18n('G_RULE')}("${rule.name}")`);
    result.leftBrace();
    // 事件
    result.push(i18n('G_RULE_EVENT'));
    result.leftBrace();
    getEventText(rule.event).forEach(text => result.push(text + ';'));
    result.rightBrace();
    // 条件
    result.push(i18n('G_RULE_COND'));
    result.leftBrace();
    rule.conditions.map(conditionToCode).forEach(text => result.push(text + ';'));
    result.rightBrace();
    // 规则
    result.push(i18n(''));
    result.leftBrace();
    rule.actions.map(expressionToCode).forEach(text => result.push(text + ';'));
    result.rightBrace();
    // 完成规则
    result.rightBrace();
    result.push();
  });

  return result.get();
}