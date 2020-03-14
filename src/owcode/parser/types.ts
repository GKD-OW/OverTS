import * as ts from "typescript";
import { OverTSError } from "../../share/error";
import { formatTo } from "../../share/utils";
import { ExpressionKind } from "../share/ast/expression";
import * as data from '../share/helper.json';

export interface ExceptedType {
  kind: ExpressionKind;
  isAny?: boolean;
  // 注意：这个Prefix一律不带CONST_、FUNC_这样的前缀
  prefix?: string;
}
interface HelperData {
  enums: string[];
  classes: string[];
  constants: { [x: string]: ts.TypeNode };
  functions: { [x: string]: {
    returnType: ts.TypeNode,
    arguments: {
      name: string,
      type: ts.TypeNode
    }[]
  }};
}

export function isTypesMatch(type1: ExceptedType[], type2: ExceptedType[]) {
  for (const it of type2) {
    if (isTypeMatch(type1, it)) {
      return true;
    }
  }
  return false;
}

export function isTypeMatch(types: ExceptedType[], type: ExceptedType) {
  if (type.isAny) {
    return true;
  }
  for (const it of types) {
    if (it.isAny || (it.kind === type.kind && it.prefix === type.prefix)) {
      return true;
    }
  }
  return false;
}

export function isPrefixMatch(types: ExceptedType[], prefix: string) {
  for (const it of types) {
    if (it.prefix && prefix.indexOf(it.prefix) === 0) {
      return true;
    }
  }
  return false;
}

export function createAny(): ExceptedType {
  return {
    kind: ExpressionKind.CONSTANT,
    isAny: true
  }
}

class TypesClazz {
  private data: HelperData;
  private mapEnum: { [x: string]: string } = {};
  private mapFunc: { [x: string]: string } = {};
  private mapClass: { [x: string]: string } = {};
  constructor() {
    this.data = data as any;
    this.data.enums.forEach(it => {
      this.mapEnum[formatTo(it, 'TO_FORMAT')] = it;
    });
    this.data.classes.forEach(it => {
      this.mapClass[formatTo(it, 'TO_FORMAT')] = it;
    });
    Object.keys(this.data.functions).forEach(it => {
      this.mapFunc[formatTo(it, 'TO_FORMAT')] = it;
    });
  }
  getExceptedType(item: ts.TypeNode): ExceptedType[] {
    if (ts.isTypeReferenceNode(item) && ts.isIdentifier(item.typeName)) {
      const name = item.typeName.escapedText as string;
      // console.log(name);
      if (typeof(this.mapClass[name]) !== 'undefined') {
        return [{
          kind: ExpressionKind.CONSTANT,
          prefix: formatTo(this.mapClass[name], 'TO_FORMAT')
        }];
      }
      if (typeof(this.mapEnum[name]) !== 'undefined') {
        return [{
          kind: ExpressionKind.CONSTANT,
          prefix: formatTo(this.mapEnum[name], 'TO_FORMAT')
        }];
      }
      if (this.data.enums.includes(name) || this.data.classes.includes(name)) {
        return [{
          kind: ExpressionKind.CONSTANT,
          prefix: formatTo(name, 'TO_FORMAT')
        }];
      }
    } else if (ts.isUnionTypeNode(item)) {
      let result: ExceptedType[] = [];
      item.types.forEach(it => result = result.concat(this.getExceptedType(it)));
      // 去重
      const exists: string[] = [];
      result = result.filter(it => {
        const key = `${it.kind} ${it.prefix}`;
        if (exists.includes(key)) {
          return false;
        }
        exists.push(key);
        return true;
      });
      return result;
    } else if (ts.isArrayTypeNode(item)) {
      return this.getExceptedType(item.elementType);
    }
    switch (item.kind) {
      case ts.SyntaxKind.NumberKeyword:
        return [{
          kind: ExpressionKind.NUMBER
        }];
      case ts.SyntaxKind.BooleanKeyword:
        return [{
          kind: ExpressionKind.BOOLEAN
        }];
      case ts.SyntaxKind.StringKeyword:
        return [{
          kind: ExpressionKind.STRING
        }];
      case ts.SyntaxKind.NullKeyword:
        return [{
          kind: ExpressionKind.CONSTANT,
          prefix: 'GAME_NULL'
        }];
      case ts.SyntaxKind.VoidKeyword:
        return [];
      case ts.SyntaxKind.AnyKeyword:
        return [{
          kind: ExpressionKind.CONSTANT,
          isAny: true
        }];
    }
    throw new OverTSError(`Not found type`, item);
  }

  getConstType(name: string): ExceptedType {
    // 去除const前缀
    let constName = name;
    if (constName.indexOf('CONST_') === 0) {
      constName = constName.substr(6);
    }
    if (constName.indexOf('GAME_') === 0) {
      const gameConstName = constName.substr(5);
      if (typeof(this.data.constants[gameConstName]) === 'undefined') {
        throw new OverTSError("No game constant " + gameConstName, gameConstName);
      }
      return this.getExceptedType(this.data.constants[gameConstName])[0];
    } else {
      const enumKeys = Object.keys(this.mapEnum);
      for (const it of enumKeys) {
        if (constName.indexOf(it) === 0) {
          return {
            kind: ExpressionKind.CONSTANT,
            prefix: it
          };
        }
      }
      throw new OverTSError("No constant " + constName, constName);
    }
  }

  getFunctionType(name: string) {
    let funcName = name;
    if (typeof(this.mapFunc[funcName]) !== 'undefined') {
      funcName = this.mapFunc[funcName];
    }
    if (typeof(this.data.functions[funcName]) === 'undefined') {
      throw new OverTSError("No function " + funcName, {
        origin: name,
        realname: funcName
      });
    }
    const func = this.data.functions[funcName];
    return {
      returnType: this.getExceptedType(func.returnType),
      arguments: func.arguments.map(it => this.getExceptedType(it.type)),
    }
  }
}

const Types = new TypesClazz;
export default Types;