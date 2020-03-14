import * as ts from 'typescript';
import { constAlias, enumAlias, enumType, funcAlias, paramTypeAlias, typeAlias } from './alias';
import Lang from './lang';
import { createConst, createDeclare, createEnum, createFunction, createModule, createSetGlobal, insertToModule, formatTo } from './utils';
import { AvaliableType, ParseResult } from './var';
import * as prettier from 'prettier';

const returnType: { [x: string]: string } = require('./returnType.json');
const constType: { [x: string]: string } = require('./constType.json');

const knownType: { [x: string]: AvaliableType } = {
  CompareSymbol: ts.createTypeReferenceNode('CompareSymbol', undefined),
  PLAYER: ts.createTypeReferenceNode('Player', undefined),
  MAPITEM: ts.createTypeReferenceNode('MapItem', undefined),
  ANY: ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
  VOID: ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
  VARIABLE: ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
  BOOLEAN: ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
  NUMBER: ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
  STRING: ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
  NULL: ts.createKeywordTypeNode(ts.SyntaxKind.NullKeyword),
}

const simpleCalc = ['add', 'subtract', 'multiply', 'divide'];

interface GeneratorResult {
  setGlobal: { [x: string]: ts.Expression };
  constants: ts.VariableStatement[];
  enums: { [x: string]: { [x: string]: ts.Expression | undefined } };
  functions: ts.FunctionDeclaration[];
}

interface EnumMeta {
  names: string[];
  upperNames: string[]
}

export default class Generator {
  private text: string;
  private result: GeneratorResult;
  private enumMeta: EnumMeta;
  private static enumAliasNames = Object.keys(enumAlias);
  private static enumAliasNamesUpper = Generator.enumAliasNames.map(it => it.toUpperCase());
  private lang: Lang;

  constructor(fromText: string, lang: Lang) {
    this.lang = lang;
    this.text = fromText;
    this.result = {
      setGlobal: {},
      functions: [],
      constants: [],
      enums: {}
    };
    this.enumMeta = {
      names: [],
      upperNames: []
    };
  }

  private putEnum(name: string, key: string) {
    let parentName = name;
    // alias
    if (typeof(enumAlias[parentName]) !== 'undefined') {
      parentName = enumAlias[parentName];
    }
    if (typeof(this.result.enums[parentName]) === 'undefined') {
      this.result.enums[parentName] = {};
      // 加到索引列表里面
      this.enumMeta.names.push(parentName);
      this.enumMeta.upperNames.push(parentName.toUpperCase());
    }
    if (typeof(this.result.enums[parentName][key]) !== 'undefined') {
      return;
    }
    // 看一下有没有特别指定的类型
    if (typeof(enumType[parentName]) !== 'undefined') {
      switch (enumType[parentName]) {
        case 'STRING':
          this.result.enums[parentName][key] = ts.createStringLiteral(key);
          break;
        default:
          this.result.enums[parentName][key] = ts.createStringLiteral(`_GKD_${enumType[parentName]}_`);
      }
    } else {
      this.result.enums[parentName][key] = undefined;
    }
  }

  private detectType(text: string): AvaliableType {
    // 如果有好几种类型
    if (text.includes('|')) {
      return ts.createUnionTypeNode(text.split('|').map(it => this.detectType(it.trim())));
    }
    // 可能是数组类型
    if (/\[\]$/.test(text)) {
      return ts.createArrayTypeNode(this.detectType(text.substr(0, text.length - 2)));
    }
    // 末尾有个?
    if (/\?$/.test(text)) {
      return ts.createUnionTypeNode([
        this.detectType(text.substr(0, text.length - 1)),
        ts.createKeywordTypeNode(ts.SyntaxKind.NullKeyword)
      ]);
    }
    // 看看有没有变名字
    if (typeof(typeAlias[text]) !== 'undefined') {
      return this.detectType(typeAlias[text]);
    }
    // 从已知类型中检测
    if (typeof(knownType[text]) !== 'undefined') {
      return knownType[text];
    }
    // 从之前的enum中检测
    let typeText = text;
    let hasGot = false;
    if (Generator.enumAliasNamesUpper.includes(typeText)) {
      hasGot = true;
      typeText = enumAlias[Generator.enumAliasNames[Generator.enumAliasNamesUpper.indexOf(typeText)]];
    }
    if (this.enumMeta.names.includes(typeText)) {
      hasGot = true;
    }
    const isEnum = this.enumMeta.upperNames.indexOf(typeText);
    if (isEnum !== -1) {
      hasGot = true;
      typeText = this.enumMeta.names[isEnum];
    }
    if (typeof(enumType[typeText]) !== 'undefined') {
      return this.detectType(enumType[typeText]);
    }
    if (hasGot) {
      return ts.createTypeReferenceNode(typeText, undefined);
    }

    // !unknownTypes.includes(text) && unknownTypes.push(text);
    return knownType['ANY'];
  }

  public set(result: ParseResult) {
    // 写入事件
    this.result.setGlobal['Events'] = ts.createObjectLiteral(result.events.map(event => {
      const node = ts.createPropertyAssignment(ts.createIdentifier(event), ts.createStringLiteral(event));
      return node;
    }));
    // 写常量
    const gameConst: string[] = [];
    result.constants.map(it => {
      const index = it.indexOf('.');
      const parentName = it.substr(0, index);
      const selfName = it.substr(index + 1);
      if (parentName === 'Game') {
        gameConst.push(selfName);
      } else {
        this.putEnum(parentName, selfName);
      }
    });
    this.result.constants = gameConst.map(it => {
      const name = typeof(constAlias[it]) === 'undefined' ? it : constAlias[it];
      const type = typeof(constType[name]) === 'undefined' ? knownType['ANY'] : this.detectType(constType[name]);
      return createConst(name, type);
    });
    // 事件
    result.events.forEach(it => {
      this.putEnum('Events', it);
    });
    // 字符串
    result.strings.forEach(it => {
      this.putEnum('Strings', it);
    });
    // 函数声明
    const unknownReturn: string[] = [];
    this.result.functions = result.functions.map(it => {
      let name = it.name;
      if (typeof(funcAlias[name]) !== 'undefined') {
        name = funcAlias[name];
      }
      let itReturn: AvaliableType = knownType['ANY'];
      if (typeof(returnType[name]) === 'undefined') {
        unknownReturn.push(name);
      } else {
        itReturn = this.detectType(returnType[name]);
      }
      const key = 'FUNC_' + formatTo(name, 'TO_FORMAT');
      const commentName = typeof(this.lang.result['zh-CN'][key]) !== 'undefined' ? this.lang.result['zh-CN'][key] : name;
      return createFunction(name, it.args.map(arg => {
        const key = `${name}.${arg.name}`;
        let type = arg.type;
        // 名称是array的，参数类型一律是any[]
        if (arg.name === 'array') {
          type = 'ANY[]';
        }
        // 简单运算的那几个，参数都是NUMBER | Vector
        if (simpleCalc.includes(name)) {
          type = 'NUMBER | Vector';
        }
        // 参数如果是玩家，那么一定也支持多个玩家
        if (type === 'PLAYER') {
          type = 'PLAYER | PLAYER[]'
        }
        if (typeof(paramTypeAlias[key]) !== 'undefined') {
          type = paramTypeAlias[key];
        }
        return {
          name: arg.name,
          desc: arg.desc,
          type: this.detectType(type)
        }
      }), itReturn, commentName, it.desc);
    });

    // 生成返回定义
    // const returns: any = {};
    // unknownReturn.forEach(it => returns[it] = "");
    // fs.writeFileSync(resolve(__dirname, 'returnType_2.json'), JSON.stringify(returns, null, '  '), { encoding: 'UTF8' });
  }

  getJson() {
    const result = {
      classes: ['Player', 'MapItem'],
      enums: Object.keys(this.result.enums),
      constants: {} as any,
      functions: {} as any
    };
    this.result.constants.forEach(it => {
      const declareItem = it.declarationList.declarations[0];
      result.constants[(declareItem.name as ts.Identifier).text] = declareItem.type;
    });
    result.constants['ELSE'] = result.functions['END'] = ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
    this.result.functions.forEach(it => {
      if (!it.name) {
        return;
      }
      const name = it.name.text;
      result.functions[name] = {
        returnType: it.type,
        arguments: it.parameters.map(paramItem => {
          return {
            name: (paramItem.name as ts.Identifier).text,
            type: paramItem.type
          }
        })
      };
    });
    result.functions['If'] = result.functions['While'] = {
      returnType: ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
      arguments: [{
        name: 'condition',
        type: ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword)
      }]
    };
    return result;
  }

  getText() {
    const file = ts.createSourceFile('helper.ts', this.text, ts.ScriptTarget.Latest, false);
    const statements = [...file.statements];
    // 全局复写
    Object.keys(this.result.setGlobal).forEach(it => {
      statements.push(createSetGlobal(it, this.result.setGlobal[it]));
    });
    // 写入声明
    const gameNs = createModule('Game', [], ts.NodeFlags.Namespace, false);
    this.result.constants.forEach(it => insertToModule(gameNs, it));
    statements.push(createDeclare([
      gameNs,
      ...Object.keys(this.result.enums).map(it => createEnum(it, this.result.enums[it]))
    ]));
    statements.push(createDeclare(this.result.functions));

    // 生成
    file.statements = ts.createNodeArray(statements);
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
}