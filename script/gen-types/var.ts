import * as ts from 'typescript';

export type langType = 'G' | 'CONST' | 'FUNC' | 'EVENT';

export const langs = ["en-US", "ja-JP", "zh-CN"];

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