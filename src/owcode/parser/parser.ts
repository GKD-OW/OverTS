import { OverTSError } from "../../share/error";
import { formatTo } from "../../share/utils";
import { Condition } from "../share/ast/conditions";
import { CallExpression, ElseIfExpression, ExpressionKind, IfExpression, isCallExpression, isIfExpression, OWExpression, RecursiveExpression, WhileExpression } from "../share/ast/expression";
import { CompareSymbolStrings } from "../share/compareSymbol";
import Types, { createAny, ExceptedType, isPrefixMatch, isTypeMatch, isTypesMatch } from "./types";
import { BranceArea, copyArray, createCompare, detectKey, trimSemi } from "./utils";

export function parseSimpleExpression(text: string, type: ExceptedType[]): OWExpression {
  // 尝试解析为数字
  if (isTypeMatch(type, {
    kind: ExpressionKind.NUMBER
  })) {
    const num = parseFloat(text);
    if (!Number.isNaN(num)) {
      return {
        kind: ExpressionKind.NUMBER,
        text: num.toString()
      };
    }
  }
  // 可能是字符串
  if (isTypeMatch(type, {
    kind: ExpressionKind.STRING
  })) {
    if (text.charAt(0) === '"') {
      return {
        kind: ExpressionKind.STRING,
        text: text.substring(1, text.length - 1)
      };
    }
  }
  // 解析为特定的Key
  const maybeKey = detectKey(text, 'CONST_');
  if (maybeKey.length > 0) {
    // 找到类型最合适的一个
    let thisKey = "";
    // 如果就一个，那就不用找了
    if (maybeKey.length === 1) {
      thisKey = maybeKey[0];
    } else {
      const enumPrefixs = type.filter(it => it.prefix).map(it => 'CONST_' + formatTo(it.prefix!, 'TO_FORMAT'));
      for (const key of maybeKey) {
        if (key.indexOf('CONST_GAME_') === 0) {
          const realKey = key.substr(6);
          const keyType = Types.getConstType(realKey);
          if (isPrefixMatch(type, realKey) || isTypeMatch(type, keyType)) {
            thisKey = key;
            break;
          }
        } else {
          // enum类型，拼接预期类型即可
          if (enumPrefixs.length) {
            for (const prefix of enumPrefixs) {
              if (key.indexOf(prefix) === 0) {
                thisKey = key;
                break;
              }
            }
            if (thisKey !== '') {
              break;
            }
          }
        }
      }
    }
    if (thisKey !== '') {
      if (thisKey === 'CONST_GAME_FALSE' || thisKey === 'CONST_GAME_TRUE') {
        // Boolean
        return {
          kind: ExpressionKind.BOOLEAN,
          text: thisKey.substr(11)
        };
      } else {
        // 常量
        return {
          kind: ExpressionKind.CONSTANT,
          text: thisKey.substr(6)
        };
      }
    }
  }
  // 对比较符号特殊处理
  switch (text) {
    case '==':
      return createCompare('EQUALS');
    case '>':
      return createCompare('GREATER');
    case '>=':
      return createCompare('GREATER_EQUALS');
    case '<':
      return createCompare('LESS');
    case '<=':
      return createCompare('LESS_EQUALS');
    case '!=':
      return createCompare('NOT_EQUALS');
  }
  return {
    kind: ExpressionKind.RAW,
    text: text
  };
}

export function parseExpression(text: string, type: ExceptedType[]): OWExpression | undefined {
  // 忽略掉注释
  if (text.indexOf('//') === 0) {
    return;
  }
  // 从第一个左括号开始
  const firstBracket = text.indexOf('(');
  if (firstBracket === -1) {
    // 非函数调用，返回简单结果
    return parseSimpleExpression(trimSemi(text), type);
  }
  // 返回函数调用解析结果
  const funcName = text.substr(0, firstBracket);
  const funcKeys = detectKey(funcName, 'FUNC_');
  if (funcKeys.length === 0) {
    throw new OverTSError(`Can not detect function of "${funcName}"`, text);
  }
  // 如果有多个函数，找到返回类型正确的函数
  let funcKey = funcKeys[0];
  if (funcKeys.length > 1) {
    for (const it of funcKeys) {
      if (isTypesMatch(Types.getFunctionType(it.substr(5)).returnType, type)) {
        funcKey = it;
        break;
      }
    }
  }
  funcKey = funcKey.substr(5);
  const result: CallExpression = {
    kind: ExpressionKind.CALL,
    text: funcKey,
    arguments: []
  };
  const argPos: number[] = [];
  let argEnd = 0;
  // 匹配前后括号，找出中间的参数
  let bracket = 1;
  let inQuotes = false;
  for (let i = firstBracket + 1; i < text.length; i++) {
    const cur = text.charAt(i);
    if (inQuotes) {
      // 在引号里面，只识别中止引号，其他忽略
      if (cur === '"') {
        inQuotes = !inQuotes;
      }
      continue;
    } else {
      // 如果是顶层的逗号，则说明是参数分隔符
      if (cur === ',' && bracket === 1) {
        // 取到一个完整的参数了
        argPos.push(i);
      } else if (cur === '(') {
        bracket++;
      } else if (cur === ')') {
        bracket--;
        if (bracket === 0) {
          // 结束
          argEnd = i;
          break;
        }
      } else if (cur === '"') {
        inQuotes = !inQuotes;
      }
    }
  }
  // 获取参数类型
  const argsType = Types.getFunctionType(funcKey).arguments;
  // 把参数取出来，然后按照之前找到的顺序分隔开
  const argStart = firstBracket + 1;
  const addResult = (resultText: string, index: number) => {
    const res = parseExpression(resultText.trim(), argsType[index]);
    if (res) {
      result.arguments.push(res);
    }
  }
  if (argPos.length === 0) {
    // 只有一个参数
    addResult(text.substring(argStart, argEnd), 0);
  } else {
    // 记录的是逗号位置，所以后续使用的时候，有些地方要+1
    let lastIndex = 0;
    argPos.forEach((it, idx) => {
      addResult(text.substring(idx === 0 ? argStart : (argPos[idx - 1] + 1), it), idx);
      lastIndex = idx;
    });
    // 把最后一个参数放进去
    addResult(text.substring(argPos[argPos.length - 1] + 1, argEnd), lastIndex + 1);
  }
  return result;
}

/**
 * 二次递归解析，之前的简单解析不会特殊处理if、while等语句，这里处理
 * @param exps 
 */
function recursiveParse(exps: OWExpression[]) {
  let branceStack = 0;
  let thisStack = 0;
  let finalResult: OWExpression[] = [];
  let thisRecursiveExp: RecursiveExpression | undefined;
  exps.forEach((it, idx) => {
    if (it.text === 'IF' || it.text === 'WHILE' || it.text === 'ELSEIF') {
      if (!isCallExpression(it)) {
        throw new OverTSError("Not a function call", it);
      }
      if (it.text === 'ELSEIF') {
        // 把这一段变成ElseIf
        const elseIfExp: ElseIfExpression = {
          kind: ExpressionKind.ELSEIF,
          text: "",
          then: recursiveParse(copyArray(exps, thisStack + 1, idx)),
          condition: it.arguments[0]
        }
        if (typeof(thisRecursiveExp) === 'undefined' || !isIfExpression(thisRecursiveExp)) {
          throw new OverTSError('Before ElseIf must have a If', it);
        }
        thisRecursiveExp.elseIf.push(elseIfExp);
        thisStack = idx;
        return;
      }
      // while 和 if 都需要把堆栈标记 +1
      branceStack++;
      if (branceStack === 1) {
        // 如果刚好是进入这个块，记录这个块的开始索引，注意这个索引是包含了进入标记的
        thisStack = idx;
        if (it.text === 'IF') {
          const ifExp: IfExpression = {
            kind: ExpressionKind.IF,
            text: "",
            condition: it.arguments[0],
            then: [],
            elseIf: [],
            elseThen: []
          };
          thisRecursiveExp = ifExp;
        }
        if (it.text === 'WHILE') {
          const whileExp: WhileExpression = {
            kind: ExpressionKind.WHILE,
            text: "",
            condition: it.arguments[0],
            then: []
          };
          thisRecursiveExp = whileExp;
        }
      }
      return;
    }
    if (branceStack === 1) {
      // ELSE判读
      if (it.text === 'ELSE') {
        // 把这一段变成Else
        if (typeof(thisRecursiveExp) === 'undefined' || !isIfExpression(thisRecursiveExp)) {
          throw new OverTSError('Before ElseIf must have a If', it);
        }
        thisRecursiveExp.elseThen = recursiveParse(copyArray(exps, thisStack + 1, idx));
        thisStack = idx;
        return;
      }
      // END判断
      if (it.text === 'END') {
        branceStack--;
        // 把这一段的扔进去解析
        const result = recursiveParse(copyArray(exps, thisStack + 1, idx));
        if (!thisRecursiveExp) {
          throw new OverTSError('Before End must have a If or While', it);
        }
        thisRecursiveExp.then = result;
        // 放到结果中
        finalResult.push(thisRecursiveExp);
        // 已经完成这一块了，就清除掉
        thisRecursiveExp = undefined;
        return;
      }
    }
    if (branceStack === 0) {
      // 对于顶层的表达式，直接放到结果中
      finalResult.push(it);
    }
  });
  return finalResult;
}

export function parseBranceContent(content: (string | BranceArea)[]) {
  const firstResult: OWExpression[] = [];
  content.forEach(it => {
    if (typeof(it) === 'string') {
      const res = parseExpression(it, [ createAny() ]);
      res && firstResult.push(res);
    }
  });
  // 进行二次递归解析，最后返回结果
  return recursiveParse(firstResult);
}

const CompareSymbolStringArr = Object.entries(CompareSymbolStrings);
function getCompareSymbol(text: string, startIndex: number): CompareSymbol | undefined {
  for (const it of CompareSymbolStringArr) {
    if (text.substr(startIndex, it[1].length) === it[1]) {
      return typeof(it[0]) === 'string' ? parseInt(it[0]) : it[0];
    }
  }
}

export function parseCondition(content: (string | BranceArea)[]) {
  const result: Condition[] = [];
  content.forEach(it => {
    // 寻找中间的符号，需要把所有括号都排除开
    if (typeof(it) !== 'string') return;
    let bracket = 0;
    let symbolIndex = -1;
    let symbolType: CompareSymbol | undefined;
    for (let i = 0; i < it.length; i++) {
      if (it.charAt(i) === '(') {
        bracket++;
      }
      if (it.charAt(i) === ')') {
        bracket--;
      }
      if (bracket === 0) {
        const symbol = getCompareSymbol(it, i);
        if (typeof(symbol) !== 'undefined') {
          symbolIndex = i;
          symbolType = symbol;
          break;
        }
      }
    }
    if (symbolIndex === -1 || typeof(symbolType) === 'undefined') {
      throw new OverTSError('Compare symbol not found', it);
    }
    // 左右分别进行解析
    const left = parseExpression(it.substr(0, symbolIndex).trim(), [ createAny() ]);
    const symbolLeng = CompareSymbolStrings[symbolType].length;
    const right = parseExpression(trimSemi(it.substr(symbolIndex + symbolLeng).trim()), [ createAny() ]);
    if (left && right) {
      result.push({
        left,
        symbol: symbolType,
        right,
      });
    }
  });
  return result;
}