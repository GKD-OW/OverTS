import * as fs from 'fs';
import { resolve } from 'path';
import { typeAlias } from './alias';
import Generator from './generator';
import Lang from './lang';
import { formatTo } from './utils';
import { FunctionResult, ParseResult } from './var';

const rootDir = resolve(__dirname, '../..');
const sourceDir = resolve(__dirname, 'data');
const resultDir = resolve(__dirname, 'result');
const helperFile = resolve(rootDir, 'src/owcode/helper/index.ts');
const localesDir = resolve(rootDir, 'src/owcode/generator/locales');
const result: ParseResult = {
  functions: [],
  strings: [],
  constants: [],
  events: []
}

const ignores = ['return', '__end__', '__else__', '__elif__', '__if__', '__while__'];
const lang = new Lang();

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
  lang.add('FUNC', newName, allLangs);
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
    if (k && key !== '' && k.toLowerCase() !== key.toLowerCase()) {
      typeAlias[k] = key;
    }
    it.values.forEach((iit: any) => {
      let name = iit.opy;
      if (name.includes('.')) {
        name = name.substr(name.indexOf('.') + 1);
      }
      name = formatTo(name, 'TO_FORMAT');
      const fullName = key + '.' + name;
      result.constants.push(fullName);
      lang.add('CONST', fullName, iit);
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
      name = formatTo(name, 'TO_FORMAT');
      parentName = formatTo(parentName, 'ToFormat');
      const fullName = `${parentName}.${name}`;
      result.constants.push(fullName);
      lang.add('CONST', fullName, it);
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
    lang.add('EVENT', name, it);
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
    lang.add('CONST', `STR_${name}`, it);
  });
}
readStrings();


// 全局关键字
function readGlobalKeyword() {
  const keywords = read('keywords')[0];
  keywords.forEach((it: any) => {
    lang.add('G', formatTo(it['en-US'], 'TO_FORMAT'), it);
  });
}
readGlobalKeyword();

function write() {
  // 生成 ts 文件
  const gen = new Generator(fs.readFileSync(resolve(__dirname, 'global.template.ts'), { encoding: 'UTF8' }), lang);
  gen.set(result);
  fs.writeFileSync(helperFile, gen.getText(), {
    encoding: 'UTF8'
  });
  // 语言
  lang.write(localesDir);
  // 其他log类记录
  fs.writeFileSync(resolve(resultDir, 'functions.json'), JSON.stringify(result.functions, null, 2), {
    encoding: 'UTF8'
  });
  fs.writeFileSync(resolve(resultDir, 'constants.json'), JSON.stringify(result.constants, null, 2), {
    encoding: 'UTF8'
  });
}
write();