import { ExpressionKind, isCallExpression, OWExpression } from "../ast/expression";
import i18n from "./i18n";

export function expressionToCode(exp: OWExpression): string {
  switch (exp.kind) {
    case ExpressionKind.BOOLEAN:
      return i18n(`BOOL_${exp.text}`);
    case ExpressionKind.CONSTANT:
      return i18n(`CONST_${exp.text}`);
    case ExpressionKind.MATCH_SYMBOL:
      return exp.text;
    case ExpressionKind.NUMBER:
      let str = exp.text;
      if (!str.includes('.')) {
        str += '.000';
      }
      let fillZero = 4 - str.substr(str.indexOf('.')).length;
      if (fillZero < 0) {
        // 只取前三位小数
        str = str.substr(0, str.indexOf('.') + 3);
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
    const args: string = exp.arguments.map(expressionToCode).join(', ');
    return `${name}(${args})`;
  }
  throw new Error('未知表达式');
}