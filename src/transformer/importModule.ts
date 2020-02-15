import { readFileSync } from "fs";
import { dirname } from 'path';
import * as ts from "typescript";
import Transformer from ".";
import { Rule } from "../owcode/ast";
import { ExpressionKind } from "../owcode/ast/expression";
import { forEachCall, forEachRule } from "../owcode/utils";
import { uuid } from "./utils";
import { DefinedContants, ParseContext, TransformerError } from "./var";

const moduleMap: { [x: string]: string } = {};

function createConstDefine(name: string, value: ts.Expression) {
  const res = ts.createVariableStatement(undefined, ts.createVariableDeclarationList(
    [
      ts.createVariableDeclaration(
        name,
        undefined,
        value
      )
    ],
    ts.NodeFlags.Const
  ));
  res.declarationList.flags = ts.NodeFlags.Const;
  return res;
}

export function parseImportModule(context: ParseContext, name: string, option?: ts.ObjectLiteralExpression) {
  if (context.transformer.path === '') {
    throw new TransformerError('文件路径为空时，不支持模块导入', context.transformer.path);
  }
  let path = '';
  try {
    path = require.resolve(name, {
      paths: [
        context.transformer.path
      ]
    });
  } catch (e) {
    throw new TransformerError(`解析模块 ${name} 失败`, e);
  }
  if (typeof(moduleMap[path]) !== 'undefined') {
    throw new TransformerError(`检查到重复导入 ${path} 来源：${context.transformer.path}`, null);
  }
  const moduleId = uuid();
  moduleMap[path] = moduleId;
  // 读取模块内容
  const content = readFileSync(path, {
    encoding: 'UTF8'
  });
  // 将option平铺成常量
  const constants: DefinedContants = {};
  if (option) {
    option.properties.forEach(it => {
      if (!ts.isPropertyAssignment(it)) {
        throw new TransformerError('模块导入选项无效', it);
      }
      if (!it.name || !ts.isIdentifier(it.name)) {
        throw new TransformerError('模块导入选项名称无效', it);
      }
      const name = it.name.text;
      constants[name] = it.initializer;
    });
  }
  // 进行解析
  const transformer = new Transformer(content, dirname(path));
  // 将常量合并过去
  Object.keys(constants).forEach(it => {
    transformer.attach(createConstDefine(it, constants[it] as ts.Expression));
  });
  const moduleAst = transformer.getResult();
  // 给模块的各种东西都加上前缀
  moduleAst.variable.global = moduleAst.variable.global.map(it => `${moduleId}_${it}`);
  moduleAst.variable.player = moduleAst.variable.player.map(it => `${moduleId}_${it}`);
  const newSub: { [x: string]: Rule } = {};
  Object.keys(moduleAst.sub).forEach(key => {
    moduleAst.sub[key].name = `${moduleId}_${moduleAst.sub[key].name}`;
    newSub[`${moduleId}_${key}`] = moduleAst.sub[key];
  });
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
  forEachRule(moduleAst, (it, type) => {
    if (type === 'RULE') {
      it.name = `${moduleId}_${it.name}`;
    }
  });
  forEachCall(moduleAst, '', it => {
    if (typeof(argAt[it.text]) === 'undefined') {
      return;
    }
    if (!it.arguments || it.arguments.length <= argAt[it.text]) {
      return;
    }
    if (it.arguments[argAt[it.text]].kind !== ExpressionKind.RAW) {
      return;
    }
    it.arguments[argAt[it.text]].text = `${moduleId}_${it.arguments[argAt[it.text]].text}`;
  });
  // 返回，合并在主程序进行
  return moduleAst;
}