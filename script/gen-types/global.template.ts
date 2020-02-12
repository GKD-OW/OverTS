import * as globalthis from 'globalthis';
const globals: any = globalthis();

type Player = {
  kind: 'player'
};

declare global {
  function runAt(event: string): any;
  function runAt(event: string, team: Team, hero: Heros): any;
  function condition(...conditions: boolean[]): any;
}