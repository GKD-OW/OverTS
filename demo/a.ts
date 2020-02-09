import { condition, Events, Game, runAt, wait } from '../src/owcode/type';

const a = 1;
let b = 2;

export class myClass {
  @runAt(Events.GLOBAL_ONGOING)
  @condition(Game.isWaitingPlayers)
  test() {
    wait(a);
    b = b + 1;
    wait(b);
  }
}