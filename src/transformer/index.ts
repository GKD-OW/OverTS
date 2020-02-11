import * as ts from 'typescript';
import '../owcode/type/global';
import { Ast, Rule } from '../owcode/ast';
import { Condition } from '../owcode/ast/conditions';
import { OWEvent, SubEvent } from '../owcode/ast/event';
import { CallExpression, ExpressionKind } from '../owcode/ast/expression';
import { MatchSymbol } from '../owcode/type';
import { parseEvent, parseExpression } from './expression';
import { getVariable, getVariableResult, uuid } from './utils';
import { DefinedContants } from './var';


export default class Transformer {
  private ast: Ast;
  private file: ts.SourceFile;
  private vars: getVariableResult;

  constructor(content: string) {
    this.ast = {
      variable: {
        global: [],
        player: []
      },
      sub: {},
      rules: []
    };
    this.file = ts.createSourceFile('index.ts', content, ts.ScriptTarget.Latest, false);
    this.vars = {
      defines: {},
      variables: [],
      variableValues: {}
    };

    this.parse();
  }

  getResult() {
    return this.ast;
  }

  private parse() {
    // 第一遍遍历，提取所有变量声明
    this.parseVars();
    // 第二遍遍历
    this.parseClass();
  }

  private parseVars() {
    this.vars = getVariable.call(this, this.file.statements);
    this.ast.variable.global = this.vars.variables;
    // 如果有初始化，则自动增加一条初始化规则
    const globalInitializer = this.vars.variableValues;
    if (Object.keys(globalInitializer).length > 0) {
      const actions: CallExpression[] = [];
      Object.keys(globalInitializer).forEach(name => {
        actions.push({
          kind: ExpressionKind.CALL,
          text: 'SET_GLOBAL',
          arguments: [{
            kind: ExpressionKind.RAW,
            text: name
          }, globalInitializer[name]]
        });
      });
      this.ast.rules.push({
        name: "init",
        event: {
          kind: Events.GLOBAL_ONGOING
        },
        conditions: [],
        actions
      });
    }
  }

  private parseClass() {
    this.file.statements.forEach(statement => {
      // 遍历所有的类，将其中的函数作为规则
      if (ts.isClassDeclaration(statement)) {
        let className = "class_" + uuid();
        if (statement.name && ts.isIdentifier(statement.name)) {
          className = statement.name.text;
        }
        statement.members.forEach(member => {
          if (ts.isMethodDeclaration(member)) {
            this.visitMethod(className, member);
          }
        });
      }
    });
  }

  private visitMethod(className: string, method: ts.MethodDeclaration) {
    // 非public的方法，都视为禁用的规则，不理会
    let avaliable = true;
    if (method.modifiers) {
      method.modifiers.forEach(modifier => {
        if (ts.isToken(modifier)) {
          if (modifier.kind === ts.SyntaxKind.PrivateKeyword || modifier.kind === ts.SyntaxKind.ProtectedKeyword) {
            avaliable = false;
          }
        }
      })
    }
    if (!avaliable) {
      return;
    }
    const rule: Rule = {
      name: "rule",
      event: {
        kind: Events.GLOBAL_ONGOING
      },
      conditions: [],
      actions: []
    };
    // 提取名称
    if (ts.isIdentifier(method.name)) {
      rule.name = method.name.text;
    }
    // 没有主体的函数不当做有效的规则
    if (!method.body) {
      return;
    }
    // 这是一条要运行的规则，遍历注解，提取出事件和条件
    const meta = this.getRuleMeta(method.decorators);
    if (!meta) {
      // 名称由自己名称和类名称共同组成
      this.parseSub(`${className}_${rule.name}`, method.body);
    } else {
      rule.event = meta.event;
      rule.conditions = meta.conditions;
    }
    // 开始遍历主体
    rule.actions = this.parseRuleBody(method.body);
    this.ast.rules.push(rule);
  }

  private getRuleMeta(decorators?: ts.NodeArray<ts.Decorator>) {
    if (!decorators) {
      return;
    }
    let event: OWEvent | undefined = undefined;
    let conditions: Condition[] = [];
    decorators.forEach(decorator => {
      if (ts.isCallExpression(decorator.expression)) {
        if (ts.isIdentifier(decorator.expression.expression)) {
          if (decorator.expression.expression.text === 'runAt') {
            // 事件
            event = parseEvent(decorator.expression.arguments);
          }
          if (decorator.expression.expression.text === 'condition') {
            // 条件
            decorator.expression.arguments.forEach(condition => {
              // 比较
              if (ts.isBinaryExpression(condition)) {
                conditions.push({
                  left: this.parseExpression(condition.left),
                  right: this.parseExpression(condition.right),
                  symbol: MatchSymbol.EQUALS
                });
              } else {
                // 其他情况下，将左侧解析为OW表达式，右侧保持true
                conditions.push({
                  left: this.parseExpression(condition),
                  symbol: MatchSymbol.EQUALS,
                  right: {
                    kind: ExpressionKind.BOOLEAN,
                    text: 'TRUE'
                  },
                });
              }
            });
          }
        }
      }
    });
    if (typeof(event) === 'undefined') {
      return;
    }
    return {
      event,
      conditions
    }
  }

  /**
   * 解析规则主体
   * @param body 
   * @param defines 
   */
  private parseRuleBody(body: ts.Block) {
    // 首先取出宏定义（可能有）
    const vars = getVariable.call(this, body.statements);
    const defines = vars.defines;
    // 然后开始逐句解析
    const bodys: CallExpression[] = [];
    body.statements.forEach(scopeStatement => {
      // 函数调用或者函数赋值都在这里面
      if (ts.isExpressionStatement(scopeStatement)) {
        // 赋值语句，转换为读写全局变量
        if (ts.isBinaryExpression(scopeStatement.expression) && ts.isIdentifier(scopeStatement.expression.left) && scopeStatement.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
          bodys.push({
            kind: ExpressionKind.CALL,
            text: 'SET_GLOBAL',
            arguments: [{
              kind: ExpressionKind.RAW,
              text: scopeStatement.expression.left.text
            }, this.parseExpression(scopeStatement.expression.right, defines)]
          });
        }
        // 函数调用语句
        if (ts.isCallExpression(scopeStatement.expression)) {
          // 如果遇到this调用，则进行子程序解析
          // if ()
          bodys.push(this.parseExpression(scopeStatement.expression, defines) as CallExpression);
        }
      }
    });
    return bodys;
  }

  /**
   * 解析子程序，并加入到子程序列表里面
   * @param name 
   */
  public parseSub(name: string, body: ts.Block) {
    const event: SubEvent = {
      kind: Events.SUB,
      sub: name
    };
    const rule: Rule = {
      name,
      event,
      conditions: [],
      actions: this.parseRuleBody(body)
    };
    // 解析body
    this.ast.sub[name] = rule;
  }

  private parseExpression(exp: ts.Expression, defines: DefinedContants = {}) {
    const newDefines = {
      ...this.vars.defines,
      ...defines
    };
    return parseExpression.call(this, exp, newDefines, this.vars.variables);
  }
}