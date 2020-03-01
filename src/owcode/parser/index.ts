import { ActionExpression, Ast, Rule } from "../ast";
import '../helper';
import { OWEvent, PlayerEvent, SubEvent } from "../share/ast/event";
import i18n, { setLocale } from "../share/i18n";
import { parseBranceContent, parseCondition } from "./parser";
import { BranceArea, detectKey, findArea, parseBrances, trimSemi } from "./utils";

/**
 * 将OW代码转为AST
 */
class Parser {
  private result: Ast;
  constructor(text: string, locale: string) {
    this.result = {
      variable: {
        global: [],
        player: []
      },
      sub: {},
      rules: []
    };
    setLocale(locale);

    this.parse(text);
  }

  private parse(text: string) {
    const areas = parseBrances(text).content.filter(it => typeof(it) !== 'string') as BranceArea[];
    // 提取出变量区域
    const vars = findArea(i18n('G_VARIABLES'), areas);
    if (vars) {
      this.parseVar(vars);
    }
    // 开始解析规则
    const ruleRegex = new RegExp(`${i18n('G_RULE')}\\("(.*?)"\\)`, 'gm');
    areas.forEach(it => {
      if (ruleRegex.test(it.name)) {
        this.parseRule(it);
      }
    });
  }

  private parseVar(area: BranceArea) {
    // 先划分出来
    const varContent: { [x: string]: string[] } = {};
    let currentContent = "";
    area.content.forEach(lineText => {
      if (typeof(lineText) !== 'string') return;
      const line = lineText.trim();
      // 看一下是全局/用户这类定界符，还是变量名
      if (line.substr(-1) === ':') {
        currentContent = line.substr(0, line.length - 1);
        if (typeof(varContent[currentContent]) === 'undefined') {
          varContent[currentContent] = [];
        }
      } else {
        varContent[currentContent].push(line.substr(line.indexOf(':') + 1).trim());
      }
    });
    // 区分全局、用户
    if (typeof(varContent[i18n('G_GLOBAL')]) !== 'undefined') {
      this.result.variable.global = varContent[i18n('G_GLOBAL')];
    }
    if (typeof(varContent[i18n('G_PLAYER')]) !== 'undefined') {
      this.result.variable.player = varContent[i18n('G_PLAYER')];
    }
  }

  private parseRule(area: BranceArea) {
    // 提取规则名称
    const ruleName = area.name.substring(area.name.indexOf('"') + 1, area.name.lastIndexOf('"'));
    const event = this.parseRuleEvent(area);
    if (typeof(event) === 'undefined') {
      return;
    }
    const rule: Rule = {
      name: ruleName,
      event,
      conditions: [],
      actions: []
    };
    const cond = findArea(i18n('G_CONDITIONS'), area.content);
    if (cond) {
      rule.conditions = parseCondition(cond.content);
    }
    const actions = findArea(i18n('G_ACTIONS'), area.content);
    if (actions) {
      rule.actions = this.parseRuleAction(actions);
    }
    const isSub = rule.event.kind === Events.SUBROUTINE;
    if (isSub) {
      this.result.sub[rule.name] = rule;
    } else {
      this.result.rules.push(rule);
    }
  }

  private parseRuleEvent(rule: BranceArea): OWEvent | undefined {
    const event = findArea(i18n('G_EVENT'), rule.content);
    if (!event) {
      return;
    }
    // 判断是子程序还是普通规则
    if (typeof(event.content[0]) !== 'string') {
      return;
    }
    const eventType = detectKey(trimSemi(event.content[0]), 'EVENT_')[0];
    const isSub = eventType === 'EVENT_SUBROUTINE';
    if (!eventType) {
      console.error(eventType, event.content);
      return;
    }
    if (isSub) {
      // 子程序，提取子程序名称
      if (typeof(event.content[1]) !== 'string') {
        return;
      }
      const subName = trimSemi(event.content[1]);
      const ev: SubEvent = {
        kind: Events.SUBROUTINE,
        sub: subName
      };
      rule.name = subName;
      return ev;
    } else if (eventType !== 'EVENT_GLOBAL') {
      if (typeof(event.content[1]) !== 'string' || typeof(event.content[2]) !== 'string') {
        return;
      }
      // 玩家事件
      const ev: PlayerEvent = {
        // @ts-ignore
        kind: Events[eventType.substr(6)],
        team: 'TEAM_ALL',
        hero: 'GAME_ALL_HEROES'
      }
      const team = detectKey(trimSemi(event.content[1]), 'CONST_TEAM_');
      const hero = detectKey(trimSemi(event.content[2]));
      if (team.length > 0) {
        ev.team = team[0].substr(6);
      }
      if (hero.length > 0) {
        ev.hero = hero[0].substr(6);
      }
      return ev;
    } else {
      return {
        kind: Events.GLOBAL
      };
    }
  }

  // 解析规则主体
  private parseRuleAction(actions: BranceArea) {
    return parseBranceContent(actions.content) as ActionExpression[];
  }

  getResult() {
    return this.result;
  }
}

export default function(text: string, locale: string) {
  return new Parser(text, locale).getResult();
}