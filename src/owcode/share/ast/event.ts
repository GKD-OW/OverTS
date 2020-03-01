import '../../helper';

export const GlobalEvents = [Events.GLOBAL];
export const SubEvents = [Events.SUBROUTINE];

export interface OWEvent {
  kind: string;
}

export interface GlobalEvent {
  kind: Events.GLOBAL;
}
export function isGlobalEvent(obj: any): obj is GlobalEvent {
  return obj && GlobalEvents.includes(obj.kind);
}

export interface PlayerEvent extends OWEvent {
  team: string;
  hero: string;
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