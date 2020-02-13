import { AvaliableType } from "./var";
import * as ts from "typescript";

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