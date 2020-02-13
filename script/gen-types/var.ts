import * as ts from 'typescript';

export interface FunctionResult {
  name: string;
  desc: string;
  args: {
    name: string;
    desc: string;
    type: string;
  }[];
}

export type AvaliableType = ts.UnionTypeNode | ts.KeywordTypeNode | ts.TypeReferenceNode | ts.ArrayTypeNode;

export interface ParseResult {
  functions: FunctionResult[];
  strings: string[];
  constants: string[];
  events: string[];
}