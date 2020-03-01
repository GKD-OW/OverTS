import { expect } from 'chai';
import * as md5 from 'js-md5';
import { OWParser } from '../../src';
import { DATA_DIR, readData, resolve } from '../utils';

const modId = md5(resolve(DATA_DIR, 'b.ts'));
const text = readData('index.txt').replace(/MOD_ID/g, modId);
const expectAst = JSON.parse(readData('index.json').replace(/MOD_ID/g, modId));
describe("OWParser", function() {
  it("Ast equals", function() {
    const ast = OWParser(text, 'zh-CN');
    expect(ast).to.deep.equals(expectAst);
  });
});