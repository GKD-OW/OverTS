import { isPlayerEvent, isSubEvent, OWEvent } from "../ast/event";
import { Team } from "../type/variable";
import { getHero } from "./hero";
import i18n from "./i18n";

function getTeam(team: Team) {
  switch (team) {
    case Team.A:
      return i18n('TEAM_A');
    case Team.B:
      return i18n('TEAM_B');
    default:
      return i18n('TEAM_ALL');
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