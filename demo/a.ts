import '../src/owcode/type/global';


export class myClass {
  test2() {
    wait(1);
  }

  @runAt(Events.GLOBAL_ONGOING)
  @condition(Game.isWaitingPlayers)
  test() {
    // e();
    this.test2();
  }
}

class myClass2 {
  @runAt(Events.GLOBAL_ONGOING)
  @condition(Game.isWaitingPlayers)
  test() {
    wait(1);
  }
}