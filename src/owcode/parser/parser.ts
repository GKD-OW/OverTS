import { OverTSError } from "../../share/error";
import { CompareSymbolStrings } from "../generator/compareSymbolStrings";
import { Condition } from "../share/ast/conditions";
import { CallExpression, ElseIfExpression, ExpressionKind, IfExpression, isCallExpression, isIfExpression, OWExpression, RecursiveExpression, WhileExpression } from "../share/ast/expression";
import { BranceArea, copyArray, createCompare, detectKey, trimSemi } from "./utils";

function parseSimpleExpression(text: string): OWExpression {
  // 尝试解析为数字
  const num = parseFloat(text);
  if (!Number.isNaN(num)) {
    return {
      kind: ExpressionKind.NUMBER,
      text: text
    };
  }
  // 可能是字符串
  if (text.charAt(0) === '"') {
    return {
      kind: ExpressionKind.STRING,
      text: text.substring(1, text.length - 1)
    };
  }
  // 解析为特定的Key
  const maybeKey = detectKey(text, ['BOOL_', 'CONST_']);
  if (maybeKey.length > 0) {
    const key = maybeKey[0];
    if (key.indexOf('BOOL_') === 0) {
      // Boolean
      return {
        kind: ExpressionKind.BOOLEAN,
        text: key.substr(5)
      };
    } else {
      // 常量
      return {
        kind: ExpressionKind.CONSTANT,
        text: key.substr(6)
      };
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

export function parseExpression(text: string): OWExpression | undefined {
  // 忽略掉注释
  if (text.indexOf('//') === 0) {
    return;
  }
  // 从第一个左括号开始
  const firstBracket = text.indexOf('(');
  if (firstBracket === -1) {
    // 非函数调用，返回简单结果
    return parseSimpleExpression(trimSemi(text));
  }
  // 返回函数调用解析结果
  const funcName = text.substr(0, firstBracket);
  const funcKeys = detectKey(funcName, 'FUNC_');
  if (funcKeys.length === 0) {
    throw new OverTSError(`Can not detect function of "${funcName}"`, text);
  }
  const funcKey = funcKeys[0].substr(5);
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
  // 把参数取出来，然后按照之前找到的顺序分隔开
  const argStart = firstBracket + 1;
  const addResult = (resultText: string) => {
    const res = parseExpression(resultText.trim());
    if (res) {
      result.arguments.push(res);
    }
  }
  if (argPos.length === 0) {
    // 只有一个参数
    addResult(text.substring(argStart, argEnd));
  } else {
    // 记录的是逗号位置，所以后续使用的时候，有些地方要+1
    argPos.forEach((it, idx) => {
      addResult(text.substring(idx === 0 ? argStart : (argPos[idx - 1] + 1), it));
    });
    // 把最后一个参数放进去
    addResult(text.substring(argPos[argPos.length - 1] + 1, argEnd));
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
    console.log(`${idx}: ${it.text}`);
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
      const res = parseExpression(it);
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
      // @ts-ignore
      return it[0];
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
        const text = getCompareSymbol(it, i);
        if (text) {
          symbolIndex = i;
          symbolType = text;
          break;
        }
      }
    }
    if (symbolIndex === -1 || typeof(symbolType) === 'undefined') {
      throw new OverTSError('Compare symbol not found', it);
    }
    // 左右分别进行解析
    const left = parseExpression(it.substr(0, symbolIndex).trim());
    const symbolLeng = CompareSymbolStrings[symbolType].length;
    const right = parseExpression(trimSemi(it.substr(symbolIndex + symbolLeng).trim()));
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