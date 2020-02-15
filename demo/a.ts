import '../src/owcode/helper';

let b = true;
let c = [];
let d = 5;

namespace PlayerVariable {
  let damage_id;
}

const test = () => {
  addToScore(getLivingPlayers(Team.ALL), 1);
  wait(10, Wait.RESTART_WHEN_TRUE);
}

importModule('./b', {
  damage: 30
});

export class ChuanHuo {
  test() {
    abortIf(true);
    b = false;
    c[0] = 1;
    c[0]++;
    c[0] -= 10;
    d--;
    d *= 10;
    ++d;
    d = (1+2)*((3-1)*6) + Math.abs(1 - 9) * Math.floor(10 / 3) + sqrt(4);
  }

  /**
   * 加分
   * 所有玩家死亡后，给剩下的那个玩家+1分
   */
  @runAt(Events.PLAYER_DIED)
  @condition(
    getNumberOfLivingPlayers(Team.ALL) === 1,
    Game.IS_GAME_IN_PROGRESS
  )
  jiafen() {
    const test2 = () => {
      this.test();
      wait(2, Wait.RESTART_WHEN_TRUE);
    }
    test();
    test2();
    this.test();
    addToScore(getLivingPlayers(Team.ALL), 1);
    resurrect(getPlayers(Team.ALL));
    if (Game.IS_GAME_IN_PROGRESS) {
      wait(1, Wait.IGNORE_CONDITION);
    } else {
      wait(2, Wait.RESTART_WHEN_TRUE);
      this.test();
    }
    while (b) {
      test();
      wait(1, Wait.IGNORE_CONDITION);
    }
    bigMessage(Game.EVENT_PLAYER, customString("自定义字符串", null, null, null));
  }
}
