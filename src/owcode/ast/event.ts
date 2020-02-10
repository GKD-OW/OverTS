import { Events } from "../type/event";
import { Heros } from "../type/hero";
import { Team } from "../type/variable";

export const GlobalEvents = [Events.GLOBAL_ONGOING];
export const SubEvents = [Events.SUB];

export interface OWEvent {
  kind: string;
}

export function isGlobalEvent(obj: any): obj is OWEvent {
  return obj && GlobalEvents.includes(obj.kind);
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
  return obj && SubEvents.includes(obj.kind);
}