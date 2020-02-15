import * as ts from 'typescript';

// 普通算数运算符
export const simpleCalc: { [x: number]: string } = {
  [ts.SyntaxKind.PlusToken]: 'ADD',
  [ts.SyntaxKind.MinusToken]: 'SUBTRACT',
  [ts.SyntaxKind.AsteriskToken]: 'MULTIPLY',
  [ts.SyntaxKind.SlashToken]: 'DIVIDE',
  [ts.SyntaxKind.PercentToken]: 'MODULO',
  [ts.SyntaxKind.AmpersandAmpersandToken]: 'AND',
  [ts.SyntaxKind.BarBarToken]: 'OR',
};
// 运算函数 to JS运算
type NumCalcFunc = (nums: number[]) => number;
const jsSimpleCalc: { [x: string]: NumCalcFunc } = {
  ADD: (nums: number[]) => nums[0] + nums[1],
  SUBTRACT: (nums: number[]) => nums[0] - nums[1],
  MULTIPLY: (nums: number[]) => nums[0] * nums[1],
  DIVIDE: (nums: number[]) => nums[0] / nums[1],
  MODULO: (nums: number[]) => nums[0] % nums[1],
  ABS: (nums: number[]) => Math.abs(nums[0]),
  MAX: (nums: number[]) => Math.max(...nums),
  MIN: (nums: number[]) => Math.min(...nums),
  // 乘方
  RAISETOPOWER: (nums: number[]) => Math.pow(nums[0], nums[1]),
  SQRT: (nums: number[]) => Math.sqrt(nums[0]),
  ROUND: (nums: number[]) => Math.round(nums[0]),
  SIN: (nums: number[]) => Math.sin(nums[0]),
  COS: (nums: number[]) => Math.cos(nums[0]),
  TAN: (nums: number[]) => Math.tan(nums[0])
}
export function tryTinyCalc(exp: ts.Expression): number | undefined {
  if (ts.isNumericLiteral(exp)) {
    return parseFloat(exp.text);
  }
  if (ts.isBinaryExpression(exp)) {
    // 如果中间不是运算符，那就直接不是纯计算了
    if (typeof(simpleCalc[exp.operatorToken.kind]) === 'undefined') {
      return;
    }
    // 检查左右，如果左右都是运算等式或者数字，则是纯计算
    const left = tryTinyCalc(exp.left);
    const right = tryTinyCalc(exp.right);
    if (typeof(left) === 'undefined' || typeof(right) === 'undefined') {
      return;
    }
    // 将左右进行运算
    return jsSimpleCalc[simpleCalc[exp.operatorToken.kind]]([left, right]);
  }
  // 如果是括号，就把括号里面的运算一下
  if (ts.isParenthesizedExpression(exp)) {
    return tryTinyCalc(exp.expression);
  }
  // 如果是调用已知的计算函数，那也可以算是纯计算
  if (ts.isCallExpression(exp)) {
    // OW的运算函数
    if (ts.isIdentifier(exp.expression)) {
      const name = exp.expression.text.toUpperCase();
      if (typeof(jsSimpleCalc[name]) !== 'undefined') {
        // 将所有子项目平铺成数字
        const nums: number[] = [];
        for (const it of exp.arguments) {
          const itNum = tryTinyCalc(it);
          if (typeof(itNum) === 'undefined') {
            return;
          }
          nums.push(itNum);
        }
        return jsSimpleCalc[name](nums);
      }
    }
    // JS的运算函数
    if (
      ts.isPropertyAccessExpression(exp.expression) &&
      ts.isIdentifier(exp.expression.expression) &&
      exp.expression.expression.text === 'Math' &&
      ts.isIdentifier(exp.expression.name) &&
      // @ts-ignore
      typeof(Math[exp.expression.name.text]) !== 'undefined'
    ) {
      // 将所有子项目平铺成数字
      const nums: number[] = [];
      for (const it of exp.arguments) {
        const itNum = tryTinyCalc(it);
        if (typeof(itNum) === 'undefined') {
          return;
        }
        nums.push(itNum);
      }
      // @ts-ignore
      return Math[exp.expression.name.text](...nums);
    }
  }
}
