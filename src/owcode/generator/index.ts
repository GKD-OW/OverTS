import { v4 as uuidv4 } from 'uuid';
import { Ast, Rule } from "../ast";
import { expressionToCode } from "./actions";
import { conditionToCode } from "./conditions";
import { getEventText } from "./event";
import i18n from "./i18n";
import Result from "./result";

function uuid() {
  return uuidv4().replace(/\-/g, '');
}

interface GeneratorOption {
  uglify: boolean;
}
export default function(ast: Ast, options?: GeneratorOption) {
  const result = new Result;
  // TODO: 变量混淆
  if (options) {
    options.uglify = false;
  }
  // 变量混淆
  const uglifyGlobal: { [x: string]: string } = {};
  const uglifyPlayer: { [x: string]: string } = {};
  // 变量区域
  if (ast.variable.global.length > 0 || ast.variable.player.length > 0) {
    result.push(i18n('G_VARIABLES'));
    result.leftBrace();
    if (ast.variable.global.length > 0) {
      result.push(i18n('G_GLOBAL') + ':', 1);
      ast.variable.global.forEach((name, index) => {
        uglifyGlobal[name] = options?.uglify ? uuid() : name;
        result.push(`${index}: ${uglifyGlobal[name]}`);
      });
      result.push('', -1);
    }
    if (ast.variable.player.length > 0) {
      result.push(i18n('G_PLAYER') + ':', 1);
      ast.variable.player.forEach((name, index) => {
        uglifyPlayer[name] = options?.uglify ? uuid() : name;
        result.push(`${index}: ${uglifyPlayer[name]}`);
      });
      result.push('', -1);
    }
    result.rightBrace();
    result.push();
  }


  const addRule = (rule: Rule) => {
    const name = options?.uglify ? uuid() : rule.name;
    result.push(`${i18n('G_RULE')}("${name}")`);
    result.leftBrace();
    // 事件
    result.push(i18n('G_EVENT'));
    result.leftBrace();
    getEventText(rule.event).forEach(text => result.push(text + ';'));
    result.rightBrace();
    // 条件
    if (rule.conditions.length > 0) {
      result.push(i18n('G_CONDITIONS'));
      result.leftBrace();
      rule.conditions.map(conditionToCode.bind(null, uglifyGlobal, uglifyPlayer)).forEach(text => result.push(text + ';'));
      result.rightBrace();
    }
    // 规则
    if (rule.actions.length > 0) {
      result.push(i18n('G_ACTIONS'));
      result.leftBrace();
      rule.actions.map(expressionToCode.bind(null, uglifyGlobal, uglifyPlayer)).forEach(text => result.push(text + ';'));
      result.rightBrace();
    }
    // 完成规则
    result.rightBrace();
    result.push();
  }

  // 子程序
  if (Object.keys(ast.sub).length > 0) {
    result.push(i18n('G_SUB'));
    result.leftBrace();
    Object.keys(ast.sub).forEach((name, index) => {
      result.push(`${index}: ${name}`);
    });
    result.rightBrace();
    result.push();
    Object.values(ast.sub).forEach(it => {
      addRule(it);
    });
  }

  // 规则区域
  ast.rules.forEach(rule => addRule(rule));

  return result.get();
}