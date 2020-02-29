import * as ts from "typescript";
import Transformer from ".";

export type DefinedContants = { [x: string]: ts.Node };

export interface ParseContext {
  transformer: Transformer;
  defines: DefinedContants;
  vars: string[];
  belongTo?: ts.ClassDeclaration;
}