import * as fs from 'fs';
import { resolve } from 'path';
import { enumAlias, funcAlias, typeAlias } from './alias';
import Generator from './generator';
import { ksort } from './utils';
import { FunctionResult, ParseResult } from './var';

// 补充国际化文本
const locales: any = require('./locales.json');
const sourceDir = resolve(__dirname, 'data');
const resultDir = resolve(__dirname, 'result');
const result: ParseResult = {
  functions: [],
  strings: [],
  constants: [],
  events: []
}

const numToEng = {
  0: 'Zero',
  1: 'One',
  2: 'Two',
  3: 'Three',
  4: 'Four',
  5: 'Five',
  6: 'Six',
  7: 'Seven',
  8: 'Eight',
  9: 'Nine'
}
// const langs = ["en-US", "es-MX", "fr-FR", "ja-JP", "pt-BR", "zh-CN"];
const langs = ["en-US", "ja-JP", "zh-CN"];
const ignores = ['return', '__end__', '__else__', '__elif__', '__if__', '__while__'];
const langsResult: any = {};
langs.forEach(it => langsResult[it] = {});

function read(file: string) {
  const content = fs.readFileSync(resolve(sourceDir, file + '.js'), { encoding: 'UTF8' });
  const result = [];
  // 取出JSON
  let lastIndex = 0;
  while (content.indexOf('//begin-json', lastIndex) >= 0) {
    const start = content.indexOf('//begin-json', lastIndex) + 12;
    const end = content.indexOf('//end-json', lastIndex);
    const json = content.substring(start, end).trim();
    // console.log(json);
    let data = null;
    try {
      data = eval(`(${json})`);
    } catch (e) {
      console.error(`Parse json fail at ${file}`);
    }
    result.push(data);
    lastIndex = end + 10;
  }
  return result;
}

function formatArg(arg: any) {
  return {
    name: arg.name.toLowerCase().replace(/ (\w)/g, (matches: string, s1: string) => {
      return s1.toUpperCase();
    }),
    type: arg.type.toUpperCase(),
    desc: arg.description
  };
}

function getArgs(args?: any[]) {
  if (!args || args.length === 0) {
    return [];
  }
  const result = args.map(formatArg);
  let cnt = 2;
  const keys = result.map(result => result.name);
  // 第一遍：检查有没有不符合规则的
  keys.forEach((it, idx) => {
    if (!(/^([a-zA-Z])([a-zA-Z0-9_]+)$/.test(it))) {
      let newKey = it.replace(/([^a-zA-Z0-9_]+)/g, '');
      if (!(/^([a-zA-Z])/.test(newKey))) {
        newKey = 'param' + newKey;
      }
      keys[idx] = newKey;
      result[idx].name = newKey;
    }
  });
  // 第二遍：检查是否有重复的key
  keys.forEach((key, idx) => {
    let lastIndex = idx + 1;
    while (true) {
      const next = keys.indexOf(key, lastIndex);
      if (next !== -1) {
        keys[next] = `${key}${cnt++}`;
        result[next].name = keys[next];
        lastIndex = next + 1;
      } else {
        break;
      }
    }
  });
  return result;
}

/**
 * 移除前后的特殊字符
 * @param {string} str 
 */
function removeSpecial(str: string) {
  let res = str;
  res = res.replace(/(\d)/g, (m: string, s1: string) => {
    // @ts-ignore
    return numToEng[parseInt(s1)];
  });
  while (res.length > 0 && !(/^([a-zA-Z])/.test(res))) {
    res = res.substr(1);
  }
  while (res.length > 0 && !(/([a-zA-Z0-9])$/.test(res))) {
    res = res.substr(0, res.length - 1);
  }
  return res;
}

function upperFirse(str: string) {
  return str.substr(0, 1).toUpperCase() + str.substr(1);
}

function formatTo(from: string, toFormat: string) {
  // 检测当前的格式，统一转换为以空格分隔的小写命名
  let formatted = removeSpecial(from);
  formatted = formatted.replace(/([\._\-])/g, ' ');
  // 本身就是全大写的，转化为小写
  if (/^([A-Z ]+)$/.test(formatted)) {
    formatted = formatted.toLowerCase();
  }
  // 本身已经是驼峰命名了
  if (/^(\w+)$/.test(formatted)) {
    formatted = formatted.replace(/([A-Z])/g, ' $1');
  }
  const formattedArr = formatted.toLowerCase().trim().split(' ');
  // 转化为目标
  if (toFormat === 'TO_FORMAT') {
    return formattedArr.join('_').toUpperCase();
  }
  if (toFormat === 'toFormat') {
    return formattedArr[0] + formattedArr.splice(1).map(it => upperFirse(it)).join('');
  }
  if (toFormat === 'ToFormat') {
    return formattedArr.map(it => upperFirse(it)).join('');
  }
  return formatted;
}

const langWarnings: any = {};
function writeLang(key: string, allLangs: any) {
  langs.forEach(lang => {
    if (typeof(langsResult[lang][key]) !== 'undefined') {
      return;
    }
    const item = (locales[key] && locales[key][lang]) || allLangs[lang] || '';
    if (!item) {
      if (typeof(langWarnings[key]) === 'undefined') {
        langWarnings[key] = [];
      }
      if (!langWarnings[key].includes(lang)) {
        langWarnings[key].push(lang);
      }
      langsResult[lang][key] = key;
    } else {
      langsResult[lang][key] = item;
    }
  });
}

function addFunc(func: FunctionResult, allLangs: any) {
  // 看看是不是在忽略清单里面
  if (ignores.includes(func.name)) {
    return;
  }
  let newName = func.name;
  newName = formatTo(newName, 'toFormat');
  if (newName === '') {
    return;
  }
  result.functions.push({ ...func, name: newName });
  // 写入语言
  let langKey = 'FUNC_'; 
  // 语言 alias
  if (typeof(funcAlias[newName]) !== 'undefined') {
    langKey += formatTo(funcAlias[newName], 'TO_FORMAT');
  } else {
    langKey += formatTo(newName, 'TO_FORMAT');
  }
  langKey = langKey.replace(/([_]+)/g, '_');
  writeLang(langKey, allLangs);
}

// 读取actions
function readActions() {
  const actions = read('actions')[0];
  actions.forEach((it: any) => {
    addFunc({
      name: it.opy || "",
      desc: it.description,
      args: getArgs(it.args)
    }, it)
  });
}
readActions();

// 读取常量
function readConst() {
  const constants = read('constants')[0];
  Object.keys(constants).forEach(k => {
    const it = constants[k];
    let key = it.opy || formatTo(k, 'ToFormat');
    // 语言 alias
    let aliasedKey = typeof(enumAlias[key]) === 'undefined' ? key : enumAlias[key];
    if (k && aliasedKey !== '' && k.toLowerCase() !== aliasedKey.toLowerCase()) {
      typeAlias[k] = aliasedKey;
    }
    it.values.forEach((iit: any) => {
      let name = iit.opy;
      if (name.includes('.')) {
        name = name.substr(name.indexOf('.') + 1);
      }
      name = formatTo(name, 'TO_FORMAT');
      const fullName = key + '.' + name;
      // TODO: alias
      result.constants.push(fullName);
      const langKey = ('CONST_' + formatTo(`${aliasedKey}_${name}`, 'TO_FORMAT')).replace(/([_]+)/g, '_');
      writeLang(langKey, iit);
    });
  });
}
readConst();

// values比较特殊，一部分会当成函数，一部分会当成常量，取决于它有没有参数
function readValues() {
  const values = read('values')[0];
  values.forEach((it: any) => {
    if (it.args && it.args.length > 0) {
      // 当做函数处理
      addFunc({
        name: it.opy || "",
        desc: it.description,
        args: getArgs(it.args)
      }, it);
    } else {
      let name = it.opy;
      const point = name.indexOf('.');
      let parentName = "";
      if (point !== -1) {
        parentName = name.substr(0, point);
        name = name.substr(point + 1);
      } else {
        parentName = 'Game';
      }
      // 语言 alias
      const parentKey = typeof(enumAlias[parentName]) === 'undefined' ? parentName : enumAlias[parentName];
      name = formatTo(name, 'TO_FORMAT');
      parentName = formatTo(parentName, 'ToFormat');
      result.constants.push(`${parentName}.${name}`);
      const langKey = ('CONST_' + formatTo(`${parentKey}.${name}`, 'TO_FORMAT')).replace(/([_]+)/g, '_');
      writeLang(langKey, it);
    }
  });
}
readValues();

// 事件
function readEvents() {
  const events = read('keywords')[1];
  events.forEach((it: any) => {
    const name = formatTo(it.opy, 'TO_FORMAT');
    result.events.push(name);
    writeLang(`EVENT_${name}`, it);
  });
}
readEvents();


// 内置字符串
function readStrings() {
  const strings = read('stringKw')[0];
  strings.forEach((it: any) => {
    const name = formatTo(it.opy, 'TO_FORMAT');
    if (name === '') {
      return;
    }
    result.strings.push(name);
    writeLang(`CONST_STR_${name}`, it);
  });
}
readStrings();


// 全局关键字
function readGlobalKeyword() {
  const keywords = read('keywords')[0];
  keywords.forEach((it: any) => {
    const name = 'G_' + formatTo(it['en-US'], 'TO_FORMAT');
    writeLang(name, it);
  });
}
readGlobalKeyword();


// 提取出warning
if (Object.keys(langWarnings).length > 0) {
  const locales: any = {};
  Object.keys(langWarnings).forEach(name => {
    locales[name] = {};
    langWarnings[name].forEach((lang: string) => locales[name][lang] = "");
  });
  fs.writeFileSync(resolve(__dirname, 'locales_2.json'), JSON.stringify(locales, null, '  '), { encoding: 'UTF8' });
}

function write() {
  const gen = new Generator(fs.readFileSync(resolve(__dirname, 'global.template.ts'), { encoding: 'UTF8' }));
  gen.set(result);
  // 生成 ts 文件
  fs.writeFileSync(resolve(resultDir, 'global.ts'), gen.getText(), {
    encoding: 'UTF8'
  });
  fs.writeFileSync(resolve(resultDir, 'functions.json'), JSON.stringify(result.functions, null, '  '), {
    encoding: 'UTF8'
  });
  fs.writeFileSync(resolve(resultDir, 'constants.json'), JSON.stringify(result.constants, null, '  '), {
    encoding: 'UTF8'
  });
  // 写入语言
  langs.forEach(it => {
    langsResult[it] = ksort(langsResult[it]);
    fs.writeFileSync(resolve(resultDir, 'locales', it + '.json'), JSON.stringify(langsResult[it], null, '  '), {
      encoding: 'UTF8'
    });
  });
}
write();