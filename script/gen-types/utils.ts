import { AvaliableType } from "./var";
import * as ts from "typescript";

const numToEng: { [x: number]: string } = {
  0: 'Zero',
  1: 'One',
  2: 'Two',
  3: 'Three',
  4: 'Four',
  5: 'Five',
  6: 'Six',
  7: 'Seven',
  8: 'Eight',
  9: 'Nine'
}

export function ksort(obj: { [x: string]: any }): { [x: string]: any } {
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
  const result: { [x: string]: any } = {};
  keys.forEach(it => result[it] = obj[it]);
  return result;
}

export function createFunction(name: string, params: {
  name: string,
  desc: string,
  type: AvaliableType
}[], returns: AvaliableType, desc: string) {
  const result = ts.createFunctionDeclaration(
    undefined, undefined, undefined, name, undefined,
    params.map(it => ts.createParameter(undefined, undefined, undefined, it.name, undefined, it.type)),
    returns,
    undefined
  );
  ts.addSyntheticLeadingComment(result, ts.SyntaxKind.MultiLineCommentTrivia, [
    '*',
    ` * ${name}`,
    ` * ${desc}`,
    ...params.map(it => ` * @param ${it.name} ${it.desc}`),
    ' '
  ].join("\n"), true);
  return result;
}

export function createDeclare(content: ts.Statement[]) {
  return createModule('global', content, ts.NodeFlags.GlobalAugmentation)
}

export function createModule(name: string, content: ts.Statement[], flags: ts.NodeFlags, hasModifier = true) {
  return ts.createModuleDeclaration(
    undefined,
    hasModifier ? [ts.createModifier(ts.SyntaxKind.DeclareKeyword)] : [],
    ts.createIdentifier(name),
    ts.createModuleBlock(content),
    flags
  )
}

export function createEnum(name: string, member: { [x: string]: ts.Expression }) {
  return ts.createEnumDeclaration(undefined, undefined, name, Object.keys(member).map(key => {
    return ts.createEnumMember(key, member[key]);
  }));
}

export function createConst(name: string, type: ts.TypeNode) {
  return ts.createVariableStatement(
    undefined,
    ts.createVariableDeclarationList(
      [ts.createVariableDeclaration(name, type)],
      ts.NodeFlags.Const
    )
  );
}

export function insertToModule(mod: ts.ModuleDeclaration, state: ts.Statement) {
  if (!mod.body) {
    mod.body = ts.createModuleBlock([ state ]);
    return;
  }
  const statements = [ ...(mod.body as ts.ModuleBlock).statements ];
  statements.push(state);
  mod.body = ts.createModuleBlock(statements);
}

export function createSetGlobal(key: string, exp: ts.Expression) {
  return ts.createExpressionStatement(
    ts.createBinary(
      ts.createPropertyAccess(
        ts.createIdentifier('globals'),
        ts.createIdentifier(key),
      ),
      ts.SyntaxKind.EqualsToken,
      exp
    )
  );
}


/**
 * 移除前后的特殊字符
 * @param {string} str 
 */
export function removeSpecial(str: string) {
  let res = str;
  res = res.replace(/(\d)/g, (m: string, s1: string) => {
    return numToEng[parseInt(s1)];
  });
  while (res.length > 0 && !(/^([a-zA-Z])/.test(res))) {
    res = res.substr(1);
  }
  while (res.length > 0 && !(/([a-zA-Z0-9])$/.test(res))) {
    res = res.substr(0, res.length - 1);
  }
  return res;
}

function upperFirse(str: string) {
  return str.substr(0, 1).toUpperCase() + str.substr(1);
}

export function formatTo(from: string, toFormat: string) {
  // 检测当前的格式，统一转换为以空格分隔的小写命名
  let formatted = removeSpecial(from);
  formatted = formatted.replace(/([\._\-])/g, ' ');
  // 本身就是全大写的，转化为小写
  if (/^([A-Z ]+)$/.test(formatted)) {
    formatted = formatted.toLowerCase();
  }
  // 本身已经是驼峰命名了
  if (/^(\w+)$/.test(formatted)) {
    formatted = formatted.replace(/([A-Z])/g, ' $1');
  }
  const formattedArr = formatted.toLowerCase().trim().split(' ');
  // 转化为目标
  if (toFormat === 'TO_FORMAT') {
    return formattedArr.join('_').toUpperCase();
  }
  if (toFormat === 'toFormat') {
    return formattedArr[0] + formattedArr.splice(1).map(it => upperFirse(it)).join('');
  }
  if (toFormat === 'ToFormat') {
    return formattedArr.map(it => upperFirse(it)).join('');
  }
  return formatted;
}