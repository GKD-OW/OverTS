import * as ts from 'typescript';

type AvaliableType = ts.UnionTypeNode | ts.KeywordTypeNode | ts.TypeReferenceNode;

export default class TSWriter {
  private file: ts.SourceFile;
  private statements: ts.Statement[];
  constructor(text: string = '') {
    this.file = ts.createSourceFile('helper.ts', text, ts.ScriptTarget.Latest, false);
    this.statements = [...this.file.statements];
  }
  
  pushSetGlobal(key: string, exp: ts.Expression) {
    this.statements.push(
      ts.createExpressionStatement(
        ts.createBinary(
          ts.createPropertyAccess(
            ts.createIdentifier('globals'),
            ts.createIdentifier(key),
          ),
          ts.SyntaxKind.EqualsToken,
          exp
        )
      )
    );
  }
  
  pushDeclare(content: ts.Statement[]) {
    this.statements.push(this.createModule('global', content, ts.NodeFlags.GlobalAugmentation));
  }

  createFunction(name: string, params: {
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

  createModule(name: string, content: ts.Statement[], flags: ts.NodeFlags, hasModifier = true) {
    return ts.createModuleDeclaration(
      undefined,
      hasModifier ? [ts.createModifier(ts.SyntaxKind.DeclareKeyword)] : [],
      ts.createIdentifier(name),
      ts.createModuleBlock(content),
      flags
    )
  }

  createEnum(name: string, member: { [x: string]: ts.Expression }) {
    return ts.createEnumDeclaration(undefined, undefined, name, Object.keys(member).map(key => {
      return ts.createEnumMember(key, member[key]);
    }));
  }

  createConst(name: string, type: ts.KeywordTypeNode["kind"]) {
    return ts.createVariableStatement(
      undefined,
      ts.createVariableDeclarationList(
        [ts.createVariableDeclaration(name, ts.createKeywordTypeNode(type))],
        ts.NodeFlags.Const
      )
    );
  }

  insertToModule(mod: ts.ModuleDeclaration, state: ts.Statement) {
    if (!mod.body) {
      mod.body = ts.createModuleBlock([ state ]);
      return;
    }
    const statements = [ ...(mod.body as ts.ModuleBlock).statements ];
    statements.push(state);
    mod.body = ts.createModuleBlock(statements);
  }

  getText() {
    this.file.statements = ts.createNodeArray(this.statements);
    const printer = ts.createPrinter({
      newLine: ts.NewLineKind.LineFeed,
    });
    return printer.printNode(ts.EmitHint.Unspecified, this.file, this.file);
  }
}