import * as ts from 'typescript';
import { ActionExpression, Ast, Rule } from '../owcode/ast';
import '../owcode/helper';
import { Condition } from '../owcode/share/ast/conditions';
import { OWEvent, PlayerEvent, SubEvent } from '../owcode/share/ast/event';
import { CallExpression } from '../owcode/share/ast/expression';
import { mergeAst } from '../owcode/utils';
import { parseImportModule } from './importModule';
import { parseStatement } from './parser';
import { createCall, createConst, createRaw, getVariable, getVariableResult, parseCondition, parseEvent, uuid } from './utils';
import { DefinedContants, ParseContext, TransformerError } from './var';

export default class Transformer {
  private ast: Ast;
  private file: ts.SourceFile;
  private fileStatements: ts.Statement[];
  private vars: getVariableResult;
  public path: string;
  private parsed = false;

  constructor(content: string, path?: string) {
    this.path = path || "";
    this.ast = {
      variable: {
        global: [],
        player: []
      },
      sub: {},
      rules: []
    };
    this.file = ts.createSourceFile('index.ts', content, ts.ScriptTarget.Latest, false);
    this.fileStatements = [...this.file.statements];
    this.vars = {
      defines: {},
      variables: [],
      variableValues: {}
    };
  }

  // 将语句附加到当前语句后面
  attach(statement: ts.Statement) {
    this.fileStatements.push(statement);
  }

  getResult() {
    if (!this.parsed) {
      this.parse();
    }
    return this.ast;
  }

  private parse() {
    // 先进行模块导入
    this.parseImport();
    // 第一遍遍历，提取所有变量声明
    this.parseVars();
    // 第二遍遍历
    this.parseClass();
    this.parsed = true;
  }

  private parseVars() {
    this.vars = getVariable(this.getParseContext(), this.fileStatements);
    this.ast.variable.global = this.ast.variable.global.concat(this.vars.variables);
    // 如果有初始化，则自动增加一条初始化规则
    const globalInitializer = this.vars.variableValues;
    if (Object.keys(globalInitializer).length > 0) {
      const actions: CallExpression[] = [];
      Object.keys(globalInitializer).forEach(name => {
        actions.push(createCall('SET_GLOBAL_VAR', createRaw(name), globalInitializer[name]));
      });
      this.ast.rules.push({
        name: "init",
        event: {
          kind: Events.GLOBAL
        },
        conditions: [],
        actions
      });
    }
    // 看看有没有玩家变量
    let playerVarsArray: ts.NodeArray<ts.Statement> | undefined = undefined;
    this.fileStatements.forEach(it => {
      if (ts.isModuleDeclaration(it) &&
        ts.isIdentifier(it.name) &&
        it.name.text === 'PlayerVariable' &&
        it.body &&
        ts.isModuleBlock(it.body)
      ) {
        playerVarsArray = it.body.statements;
      }
    });
    if (playerVarsArray) {
      const playerVars = getVariable(this.getParseContext(), playerVarsArray);
      this.ast.variable.player = this.ast.variable.player.concat(playerVars.variables);
      // 如果有初始化，则自动增加一条初始化规则
      const playerInitializer = playerVars.variableValues;
      if (Object.keys(playerInitializer).length > 0) {
        const actions: CallExpression[] = [];
        Object.keys(playerInitializer).forEach(name => {
          actions.push(createCall('SET_PLAYER_VAR', createConst('GAME_EVENT_PLAYER'), createRaw(name), playerInitializer[name]));
        });
        const event: PlayerEvent = {
          kind: Events.EACH_PLAYER,
          team: 'TEAM_ALL',
          hero: 'GAME_ALL_HEROES'
        };
        this.ast.rules.push({
          name: "init player",
          event,
          conditions: [],
          actions
        });
      }
    }
  }

  private parseImport() {
    this.fileStatements.forEach(statement => {
      if (
        ts.isExpressionStatement(statement) &&
        ts.isCallExpression(statement.expression) &&
        ts.isIdentifier(statement.expression.expression) &&
        statement.expression.expression.text === 'importModule'
      ) {
        const args = statement.expression.arguments;
        const moduleName = args[0];
        const moduleArg = args[1];
        // 必须明确指定名称，不支持const
        if (!ts.isStringLiteral(moduleName)) {
          throw new TransformerError('模块导入必须明确指定名称', args);
        }
        if (typeof(moduleArg) !== 'undefined' && !ts.isObjectLiteralExpression(moduleArg)) {
          throw new TransformerError('模块参数必须是Object', moduleArg);
        }
        const moduleAst = parseImportModule(this.getParseContext(), moduleName.text, moduleArg);
        // 合并
        mergeAst(this.ast, moduleAst);
      }
    });
  }

  private parseClass() {
    this.fileStatements.forEach(statement => {
      // 遍历所有的类，将其中的函数作为规则
      if (ts.isClassDeclaration(statement)) {
        // 只访问带有export标志的类
        if (!statement.modifiers) {
          return;
        }
        let isExported = false;
        statement.modifiers.forEach(modifier => {
          if (modifier.kind === ts.SyntaxKind.ExportKeyword) {
            isExported = true;
          }
        });
        if (!isExported) {
          return;
        }
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
        kind: Events.GLOBAL
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
              conditions.push(parseCondition(this.getParseContext(), condition));
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
    const context = this.getParseContext(clazz);
    // 首先取出宏定义（可能有）
    const vars = getVariable(context, body.statements);
    const defines = this.getDefines(vars.defines, parentDefines);
    const newContext = this.getParseContext(clazz, defines);
    // 然后开始逐句解析
    let bodys: ActionExpression[] = [];
    body.statements.forEach(state => {
      context.belongTo = clazz;
      const resultSet = parseStatement(newContext, state);
      bodys = bodys.concat(resultSet);
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
      kind: Events.SUBROUTINE,
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

  public getParseContext(belongTo?: ts.ClassDeclaration, defines: DefinedContants = {}, merge = true): ParseContext {
    return {
      transformer: this,
      defines: merge ? this.getDefines(defines) : defines,
      vars: this.vars.variables,
      belongTo
    };
  }
}