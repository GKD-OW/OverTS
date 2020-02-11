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