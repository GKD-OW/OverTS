import '../helper';
import { getAllLocale } from "../share/i18n";
import { OWExpression, ExpressionKind } from "../share/ast/expression";
import { OverTSError } from '../../share/error';

export interface BranceArea {
  name: string;
  parent?: BranceArea;
  content: (string | BranceArea)[];
}
export function parseBrances(text: string) {
  const root: BranceArea = {
    name: "root",
    content: []
  };
  const lines = text.split("\n");
  let cur = root;
  lines.forEach((lineText, idx) => {
    const line = lineText.trim();
    if (line === '') {
      return;
    }
    if (line === '{' || line.substr(-1) === '{') {
      // 新建一个
      const newArea: BranceArea = {
        name: '',
        parent: cur,
        content: []
      };
      if (line === '{') {
        // 取上一行作为块名称
        const lastLine = lines[idx - 1].trim();
        // 但不能为空、不能为后括号
        if (lastLine !== '' && lastLine !== '}') {
          newArea.name = lastLine;
          if (cur.content.includes(lastLine)) {
            cur.content.splice(cur.content.indexOf(lastLine));
          }
        }
      } else {
        // 这一行就是名称
        newArea.name = line.substr(0, line.length - 1).trim();
      }
      cur.content.push(newArea);
      cur = newArea;
    } else if (line === '}') {
      // 结束，返回上一级
      if (!cur.parent) {
        throw new OverTSError("No match brances", cur);
      }
      cur = cur.parent;
    } else {
      cur.content.push(line);
    }
  });
  return root;
}

export function findArea(name: string, brances: (BranceArea | string)[]) {
  for (const it of brances) {
    if (typeof(it) !== 'string' && it.name === name) {
      return it;
    }
  }
}

export function detectKey(text: string, prefix?: string | string[]) {
  const origin = getAllLocale();
  let cur: string[] = [];
  if (!prefix) {
    cur = Object.keys(origin);
  } else {
    Object.keys(origin).forEach(it => {
      let isInPrefix = false;
      if (typeof(prefix) === 'string') {
        isInPrefix = it.indexOf(prefix) === 0;
      } else {
        for (const prefixItem of prefix) {
          if (it.indexOf(prefixItem) === 0) {
            isInPrefix = true;
            break;
          }
        }
      }
      if (!isInPrefix) {
        return;
      }
      cur.push(it);
    });
  }
  return cur.filter(it => text === origin[it]);
}

export function trimSemi(text: string) {
  if (text.substr(-1) === ';') {
    return text.substr(0, text.length - 1);
  }
  return text;
}

export function createCompare(symbol: string): OWExpression {
  return {
    kind: ExpressionKind.COMPARE_SYMBOL,
    text: symbol
  }
}

/**
 * 复制数组
 * @param arr 数组
 * @param startAt 开始索引
 * @param endAt 结束索引（不包括这一个）
 */
export function copyArray(arr: any[], startAt: number, endAt: number) {
  const result: any[] = [];
  for (let i = startAt; i < endAt; i++) {
    result.push(arr[i]);
  }
  return result;
}