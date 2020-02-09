import * as ts from 'typescript';
import { Ast, Rule } from './owcode/ast';
import { Events } from './owcode/type/event';
import { v4 as uuid } from 'uuid';
import { MatchSymbol, Constants } from './owcode/type';
import { CallExpression, OWExpression, ExpressionKind } from './owcode/ast/expression';
import { ConstantNamespaces } from './owcode/ast/constants';

function getCallExpression(expression: ts.CallExpression, definedContants: { [x: string]: OWExpression } = {}, globalVariables: string[] = []): CallExpression {
  let callName = '';
  if (ts.isIdentifier(expression.expression)) {
    callName = expression.expression.text;
  } else {
    throw new Error('无法识别调用');
  }
  // 尝试从definedContants里面取一下
  if (typeof(definedContants[callName]) !== 'undefined' && definedContants[callName].kind === ExpressionKind.STRING) {
    callName = definedContants[callName].text;
  }
  const result: CallExpression = {
    kind: ExpressionKind.CALL,
    text: callName.replace(/([A-Z])/g, '_$1').toUpperCase(),
    arguments: expression.arguments.map(arg => parseExpression(arg, definedContants, globalVariables))
  };
  return result;
}

// 获取算数运算符对应的函数名称
function getCalcFunc(kind: ts.SyntaxKind) {
  switch (kind) {
    case ts.SyntaxKind.PlusToken:
      return 'add';
    case ts.SyntaxKind.MinusToken:
      return 'subtract';
    case ts.SyntaxKind.AsteriskToken:
      return 'multiply';
    case ts.SyntaxKind.SlashToken:
      return 'divide';
    case ts.SyntaxKind.PercentToken:
      return 'modulo';
  }
  return '';
}

// 识别ts的表达式，将其转化为OWCode的表达式
function parseExpression(expression: ts.Expression, definedContants: { [x: string]: OWExpression } = {}, globalVariables: string[] = []): OWExpression {
  if (ts.isCallExpression(expression)) {
    return getCallExpression(expression, definedContants, globalVariables);
  }
  if (ts.isIdentifier(expression)) {
    // 普通字符，检查已定义的常量
    const name = expression.text;
    if (typeof(definedContants[name]) !== 'undefined') {
      return definedContants[name];
    }
    // 或者，也可能是全局变量
    if (globalVariables.includes(name)) {
      const exp: CallExpression = {
        kind: ExpressionKind.CALL,
        text: 'GET_GLOBAL',
        arguments: [{
          kind: ExpressionKind.RAW,
          text: name
        }]
      };
      return exp;
    }
    console.log(definedContants, globalVariables);
    throw new Error(`常量 ${name} 未定义`);
  }
  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
    // 检查是否访问的内置对象
    const name = expression.expression.text;
    if (ConstantNamespaces.includes(name)) {
      return {
        kind: ExpressionKind.CONSTANT,
        text: name.toUpperCase() + '_' + expression.name.text.replace(/([A-Z])/g, '_$1').toUpperCase()
      };
    }
  }
  if (ts.isNumericLiteral(expression)) {
    // 纯数字
    return {
      kind: ExpressionKind.NUMBER,
      text: expression.text
    };
  }
  // 运算，转化为相应函数
  if (ts.isBinaryExpression(expression)) {
    const exp: CallExpression = {
      kind: ExpressionKind.CALL,
      text: getCalcFunc(expression.operatorToken.kind).toUpperCase(),
      arguments: [
        parseExpression(expression.left, definedContants, globalVariables),
        parseExpression(expression.right, definedContants, globalVariables)
      ]
    };
    return exp;
  }
  if (expression.kind === ts.SyntaxKind.FalseKeyword) {
    // false
    return {
      kind: ExpressionKind.BOOLEAN,
      text: 'FALSE'
    };
  }
  if (expression.kind === ts.SyntaxKind.TrueKeyword) {
    // true
    return {
      kind: ExpressionKind.BOOLEAN,
      text: 'TRUE'
    };
  }
  console.error(expression);
  throw new Error('无法识别表达式');
}

interface getVariableResult {
  defines: { [x: string]: OWExpression};
  variables: string[];
  variableValues: { [x: string]: OWExpression};
}
function getVariable(statements: ts.Statement[] | ts.NodeArray<ts.Statement>) {
  const result: getVariableResult = {
    defines: {},
    variables: [],
    variableValues: {},
  }
  statements.forEach(statement => {
    // 将所有全局变量的声明提取出来
    if (ts.isVariableStatement(statement)) {
      statement.declarationList.declarations.forEach(declaration => {
        if (ts.isIdentifier(declaration.name)) {
          if (statement.declarationList.flags === ts.NodeFlags.Const) {
            if (!declaration.initializer) {
              throw new Error(`宏 ${declaration.name.text} 必须有初始值`);
            }
            result.defines[declaration.name.text] = parseExpression(declaration.initializer);
          } else {
            // 添加到变量声明
            result.variables.push(declaration.name.text);
            if (declaration.initializer) {
              result.variableValues[declaration.name.text] = parseExpression(declaration.initializer);
            }
          }
        }
      });
    }
  });
  return result;
}

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
            name: uuid(),
            event: {
              name: Events.SUB
            },
            conditions: [],
            actions: []
          };
          if (member.decorators) {
            // 这是一条要运行的规则，遍历注解，提取出事件和条件
            member.decorators.forEach(decorator => {
              if (ts.isCallExpression(decorator.expression)) {
                if (ts.isIdentifier(decorator.expression.expression)) {
                  if (decorator.expression.expression.text === 'runAt') {
                    // 事件
                    const event = decorator.expression.arguments[0];
                    if (ts.isPropertyAccessExpression(event) && ts.isIdentifier(event.expression) && event.expression.text === 'Events' && ts.isIdentifier(event.name)) {
                      // @ts-ignore
                      const eventName = Events[event.name.text];
                      rule.event = {
                        name: eventName,
                      };
                      // TODO: 其他事件参数
                    }
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