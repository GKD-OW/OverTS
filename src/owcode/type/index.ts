import { Heros } from './hero';
import { Team } from './variable';

export * from './constants';
export * from './event';
export * from './functions';
export * from './hero';
export * from './match';
export * from './variable';

export declare function runAt(event: string): any;
export declare function runAt(event: string, team: Team, hero: Heros): any;
export declare function condition(...conditions: boolean[]): any;
