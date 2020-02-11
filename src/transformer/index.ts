import * as ts from 'typescript';
import { Ast, Rule } from '../owcode/ast';
import { Condition } from '../owcode/ast/conditions';
import { OWEvent, SubEvent } from '../owcode/ast/event';
import { CallExpression, ExpressionKind } from '../owcode/ast/expression';
import '../owcode/type/global';
import { MatchSymbol } from '../owcode/type/match';
import { getFinalAccess, isCanToString, PropertyAccess } from './accessUtils';
import { parseEvent, parseExpression } from './expression';
import { createSubCall, getVariable, getVariableResult, uuid, getClassName, getMethod } from './utils';
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
        statement.members.forEach(member => {
          if (ts.isMethodDeclaration(member)) {
            this.visitMethod(statement, member);
          }
        });
      }
    });
  }

  private visitMethod(clazz: ts.ClassDeclaration, method: ts.MethodDeclaration) {
    let className = "class_" + uuid();
    if (clazz.name && ts.isIdentifier(clazz.name)) {
      className = clazz.name.text;
    } else {
      clazz.name = ts.createIdentifier(className);
    }
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
      // 没有事件的一律忽略
      return;
    } else {
      rule.event = meta.event;
      rule.conditions = meta.conditions;
    }
    // 开始遍历主体
    rule.actions = this.parseRuleBody(method.body, clazz);
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
  private parseRuleBody(body: ts.Block, clazz?: ts.ClassDeclaration, parentDefines?: DefinedContants) {
    // 首先取出宏定义（可能有）
    const vars = getVariable.call(this, body.statements);
    const defines = this.getDefines(vars.defines, parentDefines);
    // 然后开始逐句解析
    let bodys: CallExpression[] = [];
    body.statements.forEach(state => {
      // 函数调用或者函数赋值都在这里面
      if (ts.isExpressionStatement(state)) {
        // 赋值语句，转换为读写全局变量
        if (ts.isBinaryExpression(state.expression) && ts.isIdentifier(state.expression.left) && state.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
          bodys.push({
            kind: ExpressionKind.CALL,
            text: 'SET_GLOBAL',
            arguments: [{
              kind: ExpressionKind.RAW,
              text: state.expression.left.text
            }, this.parseExpression(state.expression.right, defines, false)]
          });
          return;
        }
        // 函数调用语句
        if (ts.isCallExpression(state.expression)) {
          // 获取最终访问的是谁
          const finalExp = getFinalAccess(state.expression.expression, defines);
          // 如果遇到this调用，则进行子程序解析
          if (isCanToString(finalExp)) {
            if (finalExp instanceof PropertyAccess && !isCanToString(finalExp.left)) {
              const leftExp = finalExp.left as ts.Expression;
              if (leftExp.kind === ts.SyntaxKind.ThisKeyword) {
                if (!clazz) {
                  throw new Error("Can not access 'this'");
                }
                const subMethodName = finalExp.right.toString();
                const subName = getClassName(clazz) + '_' + subMethodName;
                const subMethod = getMethod(clazz, subMethodName);
                if (!subMethod) {
                  throw new Error(`类 ${getClassName(clazz)} 上不存在方法 ${subName}`);
                }
                if (!subMethod.body) {
                  throw new Error(`方法 ${subName} 不能为空`);
                }
                this.parseSub(subName, subMethod.body);
                bodys.push(createSubCall(subName));
                return;
              }
            }
          } else if (ts.isArrowFunction(finalExp)) {
            // 箭头函数调用
            const body = (finalExp as ts.ArrowFunction).body;
            if (body) {
              if (ts.isBlock(body)) {
                // 有很多条语句的body
                bodys = bodys.concat(this.parseRuleBody(body, clazz, defines));
              } else {
                // 单条语句
                bodys.push(this.parseExpression(body, defines, false) as CallExpression);
              }
            }
            return;
          } else if (ts.isFunctionExpression(finalExp) || ts.isFunctionDeclaration(finalExp)) {
            // 普通函数调用也作为子程序进行解析
            const func = finalExp as ts.FunctionExpression;
            // 作为子程序进行
            if (func.body) {
              const name = `sub_${func.pos}_${func.end}`;
              this.parseSub(name, func.body);
              bodys.push(createSubCall(name));
            }
            return;
          } else if (ts.isFunctionDeclaration(finalExp)) {
            // 普通函数调用也作为子程序进行解析
            const func = finalExp as ts.FunctionDeclaration;
            // 作为子程序进行
            if (func.body) {
              const name = `sub_${func.pos}_${func.end}`;
              this.parseSub(name, func.body);
              bodys.push(createSubCall(name));
            }
            return;
          }
          bodys.push(this.parseExpression(state.expression, defines, false) as CallExpression);
        }
      }
    });
    return bodys;
  }

  /**
   * 解析子程序，并加入到子程序列表里面
   * @param name 
   */
  public parseSub(name: string, body: ts.Block, clazz?: ts.ClassDeclaration) {
    if (typeof(this.ast.sub[name]) !== 'undefined') {
      return;
    }
    const event: SubEvent = {
      kind: Events.SUB,
      sub: name
    };
    const rule: Rule = {
      name,
      event,
      conditions: [],
      actions: this.parseRuleBody(body, clazz)
    };
    // 解析body
    this.ast.sub[name] = rule;
  }

  private getDefines(defines: DefinedContants = {}, parentDefines?: DefinedContants) {
    return {
      ...(parentDefines || this.vars.defines),
      ...defines
    };
  }

  private parseExpression(exp: ts.Expression, defines: DefinedContants = {}, merge = true) {
    return parseExpression.call(this, exp, merge ? this.getDefines(defines) : defines, this.vars.variables);
  }
}