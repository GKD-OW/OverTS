import { condition, Events, Game, runAt, wait, Team, Heros } from '../src/owcode/type';

const a = 1;
let b = 2;
let c = 2.11111;

export class myClass {
  @runAt(Events.GLOBAL_ONGOING)
  @condition(Game.isWaitingPlayers)
  test() {
    wait(a);
    b = b + 1;
    wait(b);
  }


  @runAt(Events.PLAYER_ONGOING, Team.ALL, Heros.MERCY)
  @condition(Game.isInSetup)
  test2() {
    const x = 10;
    wait(x);
  }
}