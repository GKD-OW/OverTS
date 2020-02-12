import '../type/global';
import { isPlayerEvent, isSubEvent, OWEvent } from "../ast/event";
import { getHero } from "./hero";
import i18n from "./i18n";

function getTeam(team: Team) {
  switch (team) {
    case Team.ONE:
      return i18n('CONST_TEAM_ONE');
    case Team.TWO:
      return i18n('CONST_TEAM_TWO');
    default:
      return i18n('CONST_TEAM_ALL');
  }
}

export function getEventText(event: OWEvent): string[] {
  if (isPlayerEvent(event)) {
    return [i18n(`EVENT_${event.kind}`), getTeam(event.team), getHero(event.hero)];
  }
  if (isSubEvent(event)) {
    return [i18n(`EVENT_${event.kind}`), event.sub];
  }
  return [i18n(`EVENT_${event.kind}`)];
}