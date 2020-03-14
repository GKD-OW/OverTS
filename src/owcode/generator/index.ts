import { v4 as uuidv4 } from 'uuid';
import { Ast, Rule } from "../ast";
import { Condition } from '../share/ast/conditions';
import { CallExpression, CompareExpression, ExpressionKind, isCallExpression, isIfExpression, isWhileExpression, OWExpression } from '../share/ast/expression';
import { CompareSymbolStrings } from '../share/compareSymbol';
import i18n from "../share/i18n";
import Result from "./result";
import { getEventText } from "./utils";
import { forEachRule, forEachCall } from '../utils';
import { SubEvent } from '../share/ast/event';
import randomInt = require('random-int');

const END_FLAG = ';';

const USED_UGLIFY: number[] = [];
function getUglifyName() {
  let num = randomInt(128, 8191);
  while (USED_UGLIFY.includes(num)) {
    num = randomInt(128, 8191);
  }
  // 按照二进制的形式转字符串
  let result = "";
  while (num !== 0) {
    const it = num % 2;
    result += it === 1 ? 'l' : 'I';
    num = Math.floor(num / 2);
  }
  return result;
}
function uuid() {
  return uuidv4().replace(/\-/g, '');
}

interface GeneratorOption {
  uglify: boolean;
}
const defaultOptions: GeneratorOption = {
  uglify: false
}
class Generator {
  private ast: Ast;
  private options: GeneratorOption;
  private result: Result;
  // 混淆
  private uglifyGlobal: { [x: string]: string };
  private uglifyPlayer: { [x: string]: string };
  private uglifySub: { [x: string]: string };
  constructor(ast: Ast, options: GeneratorOption = defaultOptions) {
    // options.uglify = false;
    this.options = options;
    this.ast = ast;
    this.result = new Result;
    this.uglifyGlobal = {};
    this.uglifyPlayer = {};
    this.uglifySub = {};
  }

  gen() {
    if (this.options.uglify) {
      this.uglify();
    }
    this.genVar();
    this.genSub();
    this.genRule();
    return this.result.get();
  }

  private uglify() {
    // 混淆规则名称
    forEachRule(this.ast, (it, type) => {
      it.name = getUglifyName();
    });
    // 混淆子程序
    const newSub: { [x: string]: Rule } = {};
    Object.keys(this.ast.sub).forEach(it => {
      const event = this.ast.sub[it].event as SubEvent;
      const subName = getUglifyName();
      const originName = event.sub;
      event.sub = subName;
      this.uglifySub[originName] = subName;
      newSub[subName] = this.ast.sub[it];
    });
    this.ast.sub = newSub;
    // 混淆变量
    this.ast.variable.global.forEach((name, index) => {
      this.uglifyGlobal[name] = getUglifyName();
      this.ast.variable.global[index] = this.uglifyGlobal[name];
    });
    this.ast.variable.player.forEach((name, index) => {
      this.uglifyPlayer[name] = getUglifyName();
      this.ast.variable.player[index] = this.uglifyPlayer[name];
    });
    // 访问所有相关调用
    const argAt: { [x: string]: number } = {
      "CHASE_GLOBAL_VARIABLE_AT_RATE": 0, //"追踪全局变量频率",
      "CHASE_GLOBAL_VARIABLE_OVER_TIME": 0, //"持续追踪全局变量",
      "CHASE_PLAYER_VARIABLE_AT_RATE": 1, //"追踪玩家变量频率",
      "CHASE_PLAYER_VARIABLE_OVER_TIME": 1, //"持续追踪玩家变量",
      "GLOBAL_VAR": 0, //"全局变量",
      "MODIFY_GLOBAL_VAR": 0, //"修改全局变量",
      "MODIFY_GLOBAL_VAR_AT_INDEX": 0, //"在索引处修改全局变量",
      "MODIFY_PLAYER_VAR": 1, //"修改玩家变量",
      "MODIFY_PLAYER_VAR_AT_INDEX": 1, //"在索引处修改玩家变量",
      "PLAYER_VAR": 1, //"玩家变量",
      "SET_GLOBAL_VAR": 0, //"设置全局变量",
      "SET_GLOBAL_VAR_AT_INDEX": 0, //"在索引处设置全局变量",
      "SET_PLAYER_VAR": 1, //"设置玩家变量",
      "SET_PLAYER_VAR_AT_INDEX": 1, //"在索引处设置玩家变量",
      "STOP_CHASING_GLOBAL_VARIABLE": 0, //"停止追踪全局变量",
      "STOP_CHASING_PLAYER_VARIABLE": 1, //"停止追踪玩家变量",
    }
    const visitSub = ['CALL_SUBROUTINE', 'START_RULE'];
    forEachCall(this.ast, '', it => {
      if (visitSub.includes(it.text)) {
        if (it.arguments[0].kind !== ExpressionKind.RAW) {
          return;
        }
        it.arguments[0].text = this.uglifySub[it.arguments[0].text];
        return;
      }
      if (typeof(argAt[it.text]) === 'undefined') {
        return;
      }
      if (!it.arguments || it.arguments.length <= argAt[it.text]) {
        return;
      }
      if (it.arguments[argAt[it.text]].kind !== ExpressionKind.RAW) {
        return;
      }
      // 1是玩家变量，0是全局变量
      const arg = it.arguments[argAt[it.text]];
      if (argAt[it.text] === 1) {
        arg.text = this.uglifyPlayer[arg.text];
      } else {
        arg.text = this.uglifyGlobal[arg.text];
      }
    });
  }

  private genVar() {
    // 变量区域
    if (this.ast.variable.global.length > 0 || this.ast.variable.player.length > 0) {
      this.result.push(i18n('G_VARIABLES'));
      this.result.leftBrace();
      if (this.ast.variable.global.length > 0) {
        this.result.push(i18n('G_GLOBAL') + ':', 1);
        this.ast.variable.global.forEach((name, index) => {
          this.result.push(`${index}: ${name}`);
        });
        this.result.push('', -1);
      }
      if (this.ast.variable.player.length > 0) {
        this.result.push(i18n('G_PLAYER') + ':', 1);
        this.ast.variable.player.forEach((name, index) => {
          this.result.push(`${index}: ${name}`);
        });
        this.result.push('', -1);
      }
      this.result.rightBrace();
      this.result.push();
    }
  }

  private genSub() {
    // 子程序
    if (Object.keys(this.ast.sub).length > 0) {
      this.result.push(i18n('G_SUBROUTINES'));
      this.result.leftBrace();
      Object.keys(this.ast.sub).forEach((name, index) => {
        this.result.push(`${index}: ${name}`);
      });
      this.result.rightBrace();
      this.result.push();
      Object.values(this.ast.sub).forEach(it => {
        this.addRule(it);
      });
    }
  }

  private genRule() {
    // 规则区域
    this.ast.rules.forEach(rule => this.addRule(rule));
  }

  private addRule(rule: Rule) {
    this.result.push(`${i18n('G_RULE')}("${rule.name}")`);
    this.result.leftBrace();
    // 事件
    this.result.push(i18n('G_EVENT'));
    this.result.leftBrace();
    getEventText(rule.event).forEach(text => this.result.push(text + END_FLAG));
    this.result.rightBrace();
    // 条件
    if (rule.conditions.length > 0) {
      this.result.push(i18n('G_CONDITIONS'));
      this.result.leftBrace();
      rule.conditions.forEach(cond => this.addCondition(cond));
      this.result.rightBrace();
    }
    // 规则
    if (rule.actions.length > 0) {
      this.result.push(i18n('G_ACTIONS'));
      this.result.leftBrace();
      rule.actions.forEach(it => this.addExpression(it));
      this.result.rightBrace();
    }
    // 完成规则
    this.result.rightBrace();
    this.result.push();
  }

  private addCondition(cond: Condition) {
    const result = [
      this.getSimpleExpression(cond.left),
      CompareSymbolStrings[cond.symbol],
      this.getSimpleExpression(cond.right)
    ].join(' ');
    this.result.push(result + END_FLAG);
  }

  private getSimpleExpression(exp: OWExpression) {
    switch (exp.kind) {
      case ExpressionKind.BOOLEAN:
        return i18n(`CONST_GAME_${exp.text}`);
      case ExpressionKind.CONSTANT:
        return i18n(`CONST_${exp.text}`);
      case ExpressionKind.COMPARE_SYMBOL:
        return CompareSymbolStrings[(exp as CompareExpression).compare];
      case ExpressionKind.NUMBER:
        let str = exp.text;
        if (!str.includes('.')) {
          str += '.000';
        }
        let fillZero = 4 - str.substr(str.indexOf('.')).length;
        if (fillZero < 0) {
          // 只取前三位小数
          str = str.substr(0, str.indexOf('.') + 4);
        } else {
          // 补足小数点后三位
          while (fillZero--) {
            str += '0';
          }
        }
        return str;
      case ExpressionKind.RAW:
        return exp.text;
      case ExpressionKind.STRING:
        return `"${exp.text}"`;
    }
    if (isCallExpression(exp)) {
      const name = i18n(`FUNC_${exp.text}`);
      const args: string = exp.arguments.map(it => this.getSimpleExpression(it)).join(', ');
      return `${name}(${args})`;
    }
  }

  private addExpression(exp: OWExpression) {
    const simple = this.getSimpleExpression(exp);
    if (simple) {
      this.result.push(simple + END_FLAG);
      return;
    }
    if (isIfExpression(exp)) {
      const callIf: CallExpression = {
        kind: ExpressionKind.CALL,
        text: 'IF',
        arguments: [exp.condition]
      };
      this.result.push(this.getSimpleExpression(callIf) + END_FLAG, 1);
      exp.then.forEach(it => this.addExpression(it));
      // else if
      exp.elseIf.forEach(it => {
        const callElseIf: CallExpression = {
          kind: ExpressionKind.CALL,
          text: 'ELSEIF',
          arguments: [exp.condition]
        };
        this.result.push(this.getSimpleExpression(callElseIf) + END_FLAG, 1, -1);
        it.then.forEach(iit => this.addExpression(iit));
      });
      if (exp.elseThen.length > 0) {
        const callElse: OWExpression = {
          kind: ExpressionKind.CONSTANT,
          text: 'ELSE'
        };
        this.result.push(this.getSimpleExpression(callElse) + END_FLAG, 1, -1);
        exp.elseThen.forEach(it => this.addExpression(it));
      }
      const callEnd: OWExpression = {
        kind: ExpressionKind.CONSTANT,
        text: 'END'
      };
      this.result.push(this.getSimpleExpression(callEnd) + END_FLAG, 0, -1);
    }
    if (isWhileExpression(exp)) {
      const callWhile: CallExpression = {
        kind: ExpressionKind.CALL,
        text: 'WHILE',
        arguments: [exp.condition]
      };
      this.result.push(this.getSimpleExpression(callWhile) + END_FLAG, 1);
      exp.then.forEach(it => this.addExpression(it));
      const callEnd: OWExpression = {
        kind: ExpressionKind.CONSTANT,
        text: 'END'
      };
      this.result.push(this.getSimpleExpression(callEnd) + END_FLAG, 0, -1);
    }
  }
}

export default function(ast: Ast, options: GeneratorOption = defaultOptions) {
  return new Generator(ast, options).gen();
}