import '../helper';
import { isPlayerEvent, isSubEvent, OWEvent } from "../share/ast/event";
import i18n from "../share/i18n";

export function getEventText(event: OWEvent): string[] {
  if (isPlayerEvent(event)) {
    return [i18n(`EVENT_${event.kind}`), i18n(`CONST_${event.team}`), i18n(`CONST_${event.hero}`)];
  }
  if (isSubEvent(event)) {
    return [i18n(`EVENT_${event.kind}`), event.sub];
  }
  return [i18n(`EVENT_${event.kind}`)];
}