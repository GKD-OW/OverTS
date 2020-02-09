import { isGlobalEvent, OWEvent, isPlayerEvent, isSubEvent } from "../ast/event";
import i18n from "./i18n";
import { Team } from "../type/variable";
import { getHero } from "./hero";

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
    return [i18n(`EVENT_${event.name}`), getTeam(event.team), getHero(event.hero)];
  }
  if (isSubEvent(event)) {
    return [i18n(`EVENT_${event.name}`), event.sub];
  }
  return [i18n(`EVENT_${event.name}`)];
}