import * as ts from 'typescript';
import { Ast, Rule } from '../owcode/ast';
import { CallExpression, ExpressionKind } from '../owcode/ast/expression';
import { MatchSymbol } from '../owcode/type';
import { Events } from '../owcode/type/event';
import { getCallExpression, parseEvent, parseExpression } from './expression';
import { createInitializer, getVariable } from './utils';


// 将typescript的代码转换为owcode的AST
export default function(content: string) {
  const file = ts.createSourceFile('index.ts', content, ts.ScriptTarget.Latest, false);
  // 记录变量
  const ast: Ast = {
    variable: {
      global: [],
      player: []
    },
    rules: []
  };
  // 第一遍遍历，提取所有变量声明
  const variables = getVariable(file.statements);
  ast.variable.global = variables.variables;
  const globalVariable = variables.variables;
  const globalInitializer = variables.variableValues;
  // 记录宏
  const { defines } = variables;
  // 如果有初始化，则自动增加一条初始化规则
  if (Object.keys(globalInitializer).length > 0) {
    ast.rules.push({
      name: "init",
      event: {
        kind: Events.GLOBAL_ONGOING
      },
      conditions: [],
      actions: createInitializer(globalInitializer)
    });
  }
  // 第二遍遍历
  file.statements.forEach(statement => {
    // 遍历所有的类，将其中的函数作为规则
    if (ts.isClassDeclaration(statement)) {
      statement.members.forEach(member => {
        if (ts.isMethodDeclaration(member)) {
          // 非public的方法，都视为禁用的规则，不理会
          let avaliable = true;
          if (member.modifiers) {
            member.modifiers.forEach(modifier => {
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
          if (ts.isIdentifier(member.name)) {
            rule.name = member.name.text;
          }
          if (member.decorators) {
            // 这是一条要运行的规则，遍历注解，提取出事件和条件
            member.decorators.forEach(decorator => {
              if (ts.isCallExpression(decorator.expression)) {
                if (ts.isIdentifier(decorator.expression.expression)) {
                  if (decorator.expression.expression.text === 'runAt') {
                    // 事件
                    rule.event = parseEvent(decorator.expression.arguments);
                  }
                  if (decorator.expression.expression.text === 'condition') {
                    // 条件
                    decorator.expression.arguments.forEach(condition => {
                      // 比较
                      if (ts.isBinaryExpression(condition)) {
                        rule.conditions.push({
                          left: parseExpression(condition.left, defines, globalVariable),
                          right: parseExpression(condition.right, defines, globalVariable),
                          symbol: MatchSymbol.EQUALS
                        });
                      } else {
                        // 其他情况下，将左侧解析为OW表达式，右侧保持true
                        rule.conditions.push({
                          left: parseExpression(condition),
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
            })
          } else {
            // TODO: 这是一条子程序
            // rule.event = {
            //   name: Events.SUB
            // }
          }
          // 没有主体的函数不当做有效的规则
          if (member.body) {
            const bodys: CallExpression[] = [];
            // 首先取出宏定义（可能有）
            const scopeVars = getVariable(member.body.statements);
            const scopeDefines = scopeVars.defines;
            // 然后开始遍历
            member.body.statements.forEach(scopeStatement => {
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
                    }, parseExpression(scopeStatement.expression.right, defines, globalVariable)]
                  });
                }
                // 函数调用语句
                if (ts.isCallExpression(scopeStatement.expression)) {
                  bodys.push(getCallExpression(scopeStatement.expression, {
                    ...defines,
                    ...scopeDefines
                  }, globalVariable));
                }
              }
            });
            rule.actions = bodys;
            ast.rules.push(rule);
          }
        }
      });
    }
  });
  // console.log(JSON.stringify(ast, undefined, '  '));
  // console.log(defines);
  // console.log(definesValues);
  return ast;
}