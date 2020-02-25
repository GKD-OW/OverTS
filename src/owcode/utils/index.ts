import { Ast, Rule } from "../ast";
import { CallExpression, isCallExpression } from "../share/ast/expression";

type RuleType = 'SUB' | 'RULE';

export function forEachRule(ast: Ast, callback: (it: Rule, type: RuleType) => void) {
  Object.values(ast.sub).forEach(it => callback(it, 'SUB'));
  ast.rules.forEach(it => callback(it, 'RULE'));
}

export function forEachCall(ast: Ast, callName: string, callback: (it: CallExpression) => void) {
  const forEachCallExp = (it: CallExpression) => {
    if (callName === '' || it.text === callName) {
      callback(it);
    }
    if (it.arguments && it.arguments.length > 0) {
      it.arguments.forEach(arg => {
        if (isCallExpression(arg)) {
          forEachCallExp(arg);
        }
      });
    }
  }
  forEachRule(ast, (it: Rule, type: RuleType) => {
    it.conditions.forEach(cond => {
      if (isCallExpression(cond.left)) forEachCallExp(cond.left);
      if (isCallExpression(cond.right)) forEachCallExp(cond.right);
    });
    it.actions.forEach(action => {
      if (isCallExpression(action)) {
        forEachCallExp(action);
      }
    });
  });
}

export function mergeAst(mergeInto: Ast, origin: Ast) {
  mergeInto.variable.global = mergeInto.variable.global.concat(origin.variable.global);
  mergeInto.variable.player = mergeInto.variable.player.concat(origin.variable.player);
  Object.keys(origin.sub).forEach(it => mergeInto.sub[it] = origin.sub[it]);
  mergeInto.rules = mergeInto.rules.concat(origin.rules);
}