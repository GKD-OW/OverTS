import '../src/owcode/type/global';

let a = [];
let b = [];
let c = 0;

export class myClass {
  @runAt(Events.GLOBAL)
  @condition(Game.isWaitingPlayers)
  test() {
    a[2] = 3;
    b[1] = 2;
    c++;
    a[2]++;
    c += 5;
    a[3] += 6;
    wait(a[b[1]]);
  }
}
