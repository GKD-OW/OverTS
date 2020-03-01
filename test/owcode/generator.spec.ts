import { expect } from 'chai';
import * as md5 from 'js-md5';
import { OWGenerator } from '../../src';
import { DATA_DIR, readData, resolve } from '../utils';

const modId = md5(resolve(DATA_DIR, 'b.ts'));
const ast = JSON.parse(readData('index.json').replace(/MOD_ID/g, modId));
const expectText = readData('index.txt').replace(/MOD_ID/g, modId);
describe("OWGenerator", function() {
  it("Text equals", function() {
    const text = OWGenerator(ast);
    expect(text).to.be.equals(expectText);
  });
});