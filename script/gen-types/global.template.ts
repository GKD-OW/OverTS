import * as globalthis from 'globalthis';
const globals: any = globalthis();

type Player = '_GKD_PLAYER_';
type Vector = '_GKD_VECTOR_';

declare global {
  function runAt(event: string): any;
  function runAt(event: string, team: Team, hero: Hero): any;
  function condition(...conditions: boolean[]): any;
}