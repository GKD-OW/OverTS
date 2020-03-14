import { Ast, Rule } from "../ast";
import { CallExpression, isCallExpression, isElseIfExpression, isIfExpression, isWhileExpression, OWExpression } from "../share/ast/expression";

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
  const forEachActions = (actions: OWExpression[]) => {
    actions.forEach(action => {
      if (isCallExpression(action)) {
        forEachCallExp(action);
      }
      if (isIfExpression(action)) {
        if (isCallExpression(action.condition)) forEachCallExp(action.condition);
        forEachActions(action.then);
        forEachActions(action.elseThen);
        forEachActions(action.elseIf);
      }
      if (isElseIfExpression(action)) {
        if (isCallExpression(action.condition)) forEachCallExp(action.condition);
        forEachActions(action.then);
      }
      if (isWhileExpression(action)) {
        if (isCallExpression(action.condition)) forEachCallExp(action.condition);
        forEachActions(action.then);
      }
    });
  }
  forEachRule(ast, (it: Rule, type: RuleType) => {
    it.conditions.forEach(cond => {
      if (isCallExpression(cond.left)) forEachCallExp(cond.left);
      if (isCallExpression(cond.right)) forEachCallExp(cond.right);
    });
    forEachActions(it.actions);
  });
}

export function mergeAst(mergeInto: Ast, origin: Ast) {
  mergeInto.variable.global = mergeInto.variable.global.concat(origin.variable.global);
  mergeInto.variable.player = mergeInto.variable.player.concat(origin.variable.player);
  Object.keys(origin.sub).forEach(it => mergeInto.sub[it] = origin.sub[it]);
  mergeInto.rules = mergeInto.rules.concat(origin.rules);
}