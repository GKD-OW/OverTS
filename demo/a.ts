import '../src/owcode/type/global';

let a = [];
let b = [];

export class myClass {
  @runAt(Events.GLOBAL_ONGOING)
  @condition(Game.isWaitingPlayers)
  test() {
    a[2] = 3;
    b[1] = 2;
    wait(a[b[1]]);
  }
}
