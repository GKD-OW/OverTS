import { expect } from 'chai';
import * as md5 from 'js-md5';
import { Transformer } from '../../src';
import { DATA_DIR, readData, resolve } from '../utils';

const fromTs = readData('index.ts');
const modId = md5(resolve(DATA_DIR, 'b.ts'));
const expectAst = JSON.parse(readData('index.json').replace(/MOD_ID/g, modId));
describe("Transformer", function() {
  it("Ast equals", function() {
    const ast = new Transformer(fromTs, DATA_DIR).getResult();
    expect(ast).to.deep.equals(expectAst);
  });
});