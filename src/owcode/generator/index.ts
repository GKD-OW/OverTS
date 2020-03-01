import { v4 as uuidv4 } from 'uuid';
import { Ast, Rule } from "../ast";
import { Condition } from '../share/ast/conditions';
import { CallExpression, CompareExpression, ExpressionKind, isCallExpression, isIfExpression, isWhileExpression, OWExpression } from '../share/ast/expression';
import { CompareSymbolStrings } from '../share/compareSymbol';
import i18n from "../share/i18n";
import Result from "./result";
import { getEventText } from "./utils";

const END_FLAG = ';';

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
  // 变量混淆
  private uglifyGlobal: { [x: string]: string };
  private uglifyPlayer: { [x: string]: string };
  constructor(ast: Ast, options: GeneratorOption = defaultOptions) {
    // TODO: 变量混淆
    options.uglify = false;
    this.options = options;
    this.ast = ast;
    this.result = new Result;
    this.uglifyGlobal = {};
    this.uglifyPlayer = {};
  }

  gen() {
    this.genVar();
    this.genSub();
    this.genRule();
    return this.result.get();
  }

  private genVar() {
    // 变量区域
    if (this.ast.variable.global.length > 0 || this.ast.variable.player.length > 0) {
      this.result.push(i18n('G_VARIABLES'));
      this.result.leftBrace();
      if (this.ast.variable.global.length > 0) {
        this.result.push(i18n('G_GLOBAL') + ':', 1);
        this.ast.variable.global.forEach((name, index) => {
          this.uglifyGlobal[name] = this.options.uglify ? uuid() : name;
          this.result.push(`${index}: ${this.uglifyGlobal[name]}`);
        });
        this.result.push('', -1);
      }
      if (this.ast.variable.player.length > 0) {
        this.result.push(i18n('G_PLAYER') + ':', 1);
        this.ast.variable.player.forEach((name, index) => {
          this.uglifyPlayer[name] = this.options.uglify ? uuid() : name;
          this.result.push(`${index}: ${this.uglifyPlayer[name]}`);
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
    const name = this.options.uglify ? uuid() : rule.name;
    this.result.push(`${i18n('G_RULE')}("${name}")`);
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
      // TODO: 如果是访问变量，那么做一个对应关系
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