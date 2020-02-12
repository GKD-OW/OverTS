import { CompareExpression, ExpressionKind, isCallExpression, OWExpression } from "../ast/expression";
import { compareSymbolToString } from "./compareSymbolToString";
import i18n from "./i18n";

type varMap = { [x: string]: string };
export function expressionToCode(global: varMap, player: varMap, exp: OWExpression): string {
  switch (exp.kind) {
    case ExpressionKind.BOOLEAN:
      return i18n(`CONST_GAME_${exp.text}`);
    case ExpressionKind.CONSTANT:
      return i18n(`CONST_${exp.text}`);
    case ExpressionKind.COMPARE_SYMBOL:
      return compareSymbolToString((exp as CompareExpression).compare);
    case ExpressionKind.NUMBER:
      let str = exp.text;
      if (!str.includes('.')) {
        str += '.000';
      }
      let fillZero = 4 - str.substr(str.indexOf('.')).length;
      if (fillZero < 0) {
        // 只取前三位小数
        str = str.substr(0, str.indexOf('.') + 4);
      } else {
        // 补足小数点后三位
        while (fillZero--) {
          str += '0';
        }
      }
      return str;
    case ExpressionKind.RAW:
      return exp.text;
    case ExpressionKind.STRING:
      return `"${exp.text}"`;
  }
  if (isCallExpression(exp)) {
    const name = i18n(`FUNC_${exp.text}`);
    // TODO: 如果是访问变量，那么做一个对应关系
    const args: string = exp.arguments ? exp.arguments.map(expressionToCode.bind(null, global, player)).join(', ') : '';
    return `${name}(${args})`;
  }
  throw new Error('未知表达式');
}