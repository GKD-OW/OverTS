import { Events } from "../type/event";
import { Heros } from "../type/hero";
import { Team } from "../type/variable";

export interface OWEvent {
  name: Events;
}

export function isGlobalEvent(obj: any): obj is OWEvent {
  return obj && obj.name === Events.GLOBAL_ONGOING;
}

export interface PlayerEvent extends OWEvent {
  team: Team;
  hero: Heros;
}

export function isPlayerEvent(obj: any): obj is PlayerEvent {
  return obj && !isGlobalEvent(obj) && !isSubEvent(obj);
}

export interface SubEvent extends OWEvent {
  sub: string;
}

export function isSubEvent(obj: any): obj is SubEvent {
  return obj && obj.name === Events.SUB;
}
