import * as ts from "typescript";
import Transformer from ".";

export type DefinedContants = { [x: string]: ts.Node };

export interface ParseContext {
  transformer: Transformer;
  defines: DefinedContants;
  vars: string[];
  belongTo?: ts.ClassDeclaration;
}

export class TransformerError {
  private obj: any;
  private error: Error;
  constructor(message: string, obj: any) {
    this.obj = obj;
    this.error = new Error(message);
  }
}