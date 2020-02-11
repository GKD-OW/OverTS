import '../src/owcode/type/global';

// const a = 1;
let b = 2;
// let c = 2.11111;
// const d = () => {
//   wait(1);
//   wait(2);
// }

// const f = () => wait(3);

function e() {
  b = b + 1;
}

export class myClass {
  test2() {
    //
  }

  @runAt(Events.GLOBAL_ONGOING)
  @condition(Game.isWaitingPlayers)
  test() {
    e();
    // wait(a);
    // d();
    // f();
    // this.
    // b = b + 1;
    // wait(b);
    e();
  }
}