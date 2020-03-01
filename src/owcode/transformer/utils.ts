import { formatTo } from "../../share/utils";
import '../helper';
import { Condition } from "../share/ast/conditions";
import { isGlobalEvent, isPlayerEvent, OWEvent } from "../share/ast/event";
import { ExpressionKind, OWExpression, isCallExpression, isIfExpression, isWhileExpression, isCompareExpression, CompareExpression, isElseIfExpression } from "../share/ast/expression";
import { createCall, createPropertyAccess, createNot } from "./tsCreator";
import * as ts from 'typescript';
import { OverTSError } from "../../share/error";
import { mapTsToCompare, mapCompareToTs } from "../share/compareSymbol";

function parseConst(str: string): ts.Expression {
  const fullName = str.indexOf('CONST_') === 0 ? str.substr(6) : str;
  // 对几个内容特殊处理
  switch (fullName) {
    case 'GAME_TRUE':
      return ts.createTrue();
    case 'GAME_FALSE':
      return ts.createFalse();
    case 'GAME_NULL':
      return ts.createNull();
  }
  const name = fullName.substr(fullName.indexOf('_') + 1);
  const par = formatTo(fullName.substr(0, fullName.indexOf('_')), 'ToFormat');
  return createPropertyAccess(par, name);
}

export function parseEvent(event: OWEvent) {
  if (isGlobalEvent(event)) {
    return createCall('runAt', createPropertyAccess('Events', 'GLOBAL'));
  }
  if (isPlayerEvent(event)) {
    return createCall(
      'runAt',
      createPropertyAccess('Events', event.kind),
      parseConst(event.team),
      parseConst(event.hero),
    );
  }
}

function parseExpression(exp: OWExpression): ts.Expression {
  if (isCallExpression(exp)) {
    // 特殊处理Compare、Not
    if (exp.text === 'COMPARE') {
      return ts.createBinary(
        parseExpression(exp.arguments[0]),
        mapCompareToTs[(exp.arguments[1] as CompareExpression).compare],
        parseExpression(exp.arguments[2])
      );
    } else if (exp.text === 'NOT') {
      return createNot(parseExpression(exp.arguments[0]));
    } else if (exp.text === 'CALL_SUBROUTINE') {
      return createCall(createPropertyAccess('this', exp.arguments[0].text));
    } else {
      return createCall(formatTo(exp.text, 'toFormat'), ...exp.arguments.map(it => parseExpression(it)));
    }
  } else if (isCompareExpression(exp)) {
    return createPropertyAccess('CompareSymbol', '');
  } else {
    if (exp.kind === ExpressionKind.BOOLEAN) {
      return exp.text === 'TRUE' ? ts.createTrue() : ts.createFalse();
    } else if (exp.kind === ExpressionKind.NUMBER) {
      return ts.createNumericLiteral(exp.text);
    } else if (exp.kind === ExpressionKind.RAW) {
      return ts.createStringLiteral(exp.text);
    } else if (exp.kind === ExpressionKind.STRING) {
      return ts.createStringLiteral(exp.text);
    } else if (exp.kind === ExpressionKind.CONSTANT) {
      return parseConst(exp.text);
    } else {
      throw new OverTSError('Unknown type', exp);
    }
  }
}

export function parseStatement(exp: OWExpression): ts.Statement {
  try {
    return ts.createExpressionStatement(parseExpression(exp));
  } catch (e) {
    // do nothing
  }
  if (isIfExpression(exp)) {
    let firstElseThen: ts.IfStatement | undefined;
    let nextElseThen: ts.IfStatement | undefined;
    if (exp.elseIf.length > 0) {
      exp.elseIf.forEach(it => {
        const elseIfExp = ts.createIf(
          parseExpression(it.condition),
          ts.createBlock(it.then.map(thenItem => parseStatement(thenItem)))
        );
        if (!firstElseThen) {
          firstElseThen = nextElseThen;
        }
        if (nextElseThen) {
          nextElseThen.elseStatement = elseIfExp;
        }
        nextElseThen = elseIfExp;
      });
    }
    return ts.createIf(
      parseExpression(exp.condition),
      ts.createBlock(exp.then.map(it => parseStatement(it))),
      firstElseThen
    );
  } else if (isWhileExpression(exp)) {
    return ts.createWhile(
      parseExpression(exp.condition),
      ts.createBlock(exp.then.map(it => parseStatement(it)))
    );
  } else {
    throw new OverTSError('Unknown type', exp);
  }
}

export function parseCondition(cond: Condition) {
  const left = parseExpression(cond.left);
  const right = parseExpression(cond.right);
  if (cond.symbol === CompareSymbol.EQUALS) {
    if (left.kind === ts.SyntaxKind.TrueKeyword) {
      return right;
    }
    if (left.kind === ts.SyntaxKind.FalseKeyword) {
      return createNot(right);
    }
    if (right.kind === ts.SyntaxKind.TrueKeyword) {
      return left;
    }
    if (right.kind === ts.SyntaxKind.FalseKeyword) {
      return createNot(left);
    }
  }
  // 常规解析
  return ts.createBinary(
    left,
    mapCompareToTs[cond.symbol],
    right
  );
}