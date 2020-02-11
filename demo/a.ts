import '../src/owcode/type/global';

let a = true;
let b = false;
let c = false;

export class myClass {
  @runAt(Events.GLOBAL_ONGOING)
  @condition(Game.isWaitingPlayers, a)
  test() {
    c = a && b;
  }
}
