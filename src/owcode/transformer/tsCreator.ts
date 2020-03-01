import * as ts from 'typescript';

export function createVar(name: string, value?: ts.Expression) {
  return ts.createVariableStatement(
    undefined,
    ts.createVariableDeclarationList(
      [ts.createVariableDeclaration(
        name,
        ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
        value)
      ],
      ts.NodeFlags.Let
    )
  );
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

export function createCall(name: string | ts.PropertyAccessExpression, ...args: ts.Expression[]) {
  return ts.createCall(typeof(name) === 'string' ? ts.createIdentifier(name) : name, undefined, args);
}

export function createPropertyAccess(name: string, target: string) {
  return ts.createPropertyAccess(ts.createIdentifier(name), target);
}

export function createNot(exp: ts.Expression) {
  return ts.createPrefix(ts.SyntaxKind.ExclamationToken, exp);
}