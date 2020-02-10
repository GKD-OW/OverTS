import { Team, Heros } from '../src/owcode/type';
// import '../src/owcode/type/constants';
// import '../src/owcode/type/functions';

// const a = 1;
// let b = 2;
// let c = 2.11111;
const d = () => {
  wait(1);
}

export class myClass {
  @runAt(Events.GLOBAL_ONGOING)
  @condition(Game.isWaitingPlayers)
  test() {
    // wait(a);
    d();
    // b = b + 1;
    // wait(b);
  }
}