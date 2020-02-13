import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { constAlias, enumAlias, funcAlias, typeAlias } from "./alias";
import { formatTo, ksort } from "./utils";

const langs = ["en-US", "ja-JP", "zh-CN"];
const locales: { [x: string]: { [x: string]: string } } = require('./locales.json');

export default class Lang {
  private result: { [x: string]: { [x: string]: string } }
  constructor() {
    this.result = {};
    langs.forEach(it => this.result[it] = {});
  }

  public add(type: 'G' | 'CONST' | 'FUNC' | 'EVENT', name: string, items: { [x: string]: string }) {
    let newKey = formatTo(name, 'TO_FORMAT');
    if (type === 'FUNC' && typeof(funcAlias[name]) !== 'undefined') {
      newKey = formatTo(funcAlias[name], 'TO_FORMAT');
    }
    if (type === 'CONST') {
      let left = name.substr(0, name.indexOf('.'));
      let right = name.substr(name.indexOf('.') + 1);
      if (typeof(enumAlias[left]) !== 'undefined') {
        typeAlias[left] = enumAlias[left];
        left = enumAlias[left];
      }
      if (left === 'Game' && typeof(constAlias[right]) !== 'undefined') {
        right = constAlias[right];
      }
      newKey = formatTo(`${left}.${right}`, 'TO_FORMAT');
    }
    const fullKey = `${type}_${newKey}`.replace(/([_]+)/g, '_');
    langs.forEach(lang => {
      if (typeof(this.result[lang][fullKey]) !== 'undefined') {
        return;
      }
      const item = (locales[fullKey] && locales[fullKey][lang]) || items[lang] || '';
      this.result[lang][fullKey] = item || fullKey;
    });
  }

  write(dir: string) {
    // 写入语言
    langs.forEach(it => {
      this.result[it] = ksort(this.result[it]);
      writeFileSync(resolve(dir, it + '.json'), JSON.stringify(this.result[it], null, 2), {
        encoding: 'UTF8'
      });
    });
  }
}