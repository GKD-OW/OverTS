import * as ts from 'typescript';
import { Ast, Rule } from '../ast';
import { createVar, createModule, createCall } from './tsCreator';
import { parseEvent, parseCondition, parseStatement } from './utils';
import * as prettier from 'prettier';

export default class Transformer {
  private file: ts.SourceFile;
  private statements: ts.Statement[] = [];
  constructor(ast: Ast) {
    this.file = ts.createSourceFile('index.ts', '', ts.ScriptTarget.Latest, false);
    ast.variable.global.forEach(it => {
      this.statements.push(createVar(it));
    });
    if (ast.variable.player.length > 0) {
      // 创建用户变量声明
      this.statements.push(createModule('PlayerVariable', ast.variable.player.map(it => createVar(it)), ts.NodeFlags.Namespace, false));
    }
    const methods: ts.MethodDeclaration[] = [];
    // 先处理子程序
    Object.values(ast.sub).forEach(it => {
      methods.push(this.parseRule(it));
    });
    ast.rules.forEach(it => {
      methods.push(this.parseRule(it));
    });
    // 全都放到一个class里面
    const clazz = ts.createClassDeclaration(
      undefined,
      [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
      'Rules',
      undefined,
      undefined,
      methods
    );
    this.statements.push(clazz);
  }

  gen() {
    this.file.statements = ts.createNodeArray(this.statements);
    return this.file;
  }

  genText() {
    const file = this.gen();
    const printer = ts.createPrinter({
      newLine: ts.NewLineKind.LineFeed,
    });
    const text = printer.printNode(ts.EmitHint.SourceFile, file, file);
    return prettier.format(text, {
      semi: true,
      tabWidth: 2,
      useTabs: false,
      parser: 'typescript'
    });
  }

  parseRule(rule: Rule): ts.MethodDeclaration {
    const decorators: ts.Decorator[] = [];
    // 忽略掉子程序的事件（子程序不需要事件）
    if (rule.event.kind !== Events.SUBROUTINE) {
      const event = parseEvent(rule.event);
      if (event) {
        decorators.push(ts.createDecorator(event));
      }
    }
    if (rule.conditions.length > 0) {
      const conditions = rule.conditions.map(it => parseCondition(it));
      decorators.push(ts.createDecorator(createCall('condition', ...conditions)));
    }
    const body: ts.Statement[] = rule.actions.map(it => parseStatement(it));
    // 规则主体
    return ts.createMethod(decorators, undefined, undefined, rule.name, undefined, undefined, [], undefined, ts.createBlock(body));
  }
}