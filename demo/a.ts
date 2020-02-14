import '../src/owcode/helper';

namespace PlayerVariable {
  let damage_id;
}

export class ChuanHuo {
  /**
   * 传火
   * 一个玩家打另一个，就把火传过去
   */
  // @runAt(Events.PLAYER_TOOK_DAMAGE)
  // @condition(
  //   !hasStatusEffect(Game.EVENT_PLAYER, Status.BURNING),
  //   hasStatusEffect(Game.ATTACKER, Status.BURNING)
  // )
  // chuanhuo() {
  //   setStatusEffect(Game.EVENT_PLAYER, null, Status.BURNING, 9999);
  //   startDamageOverTime(Game.EVENT_PLAYER, null, 9999, 50);
  //   // 存到damage_id
  //   setPlayerVar(Game.EVENT_PLAYER, "damage_id", Game.LAST_DAMAGE_ID);
  //   stopDamageOverTime(playerVar(Game.ATTACKER, "damage_id"));
  //   clearStatusEffect(Game.ATTACKER, Status.BURNING);
  // }

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
    addToScore(getLivingPlayers(Team.ALL), 1);
    resurrect(getPlayers(Team.ALL));
    if (Game.IS_GAME_IN_PROGRESS) {
      wait(1, Wait.IGNORE_CONDITION);
    } else {
      wait(2, Wait.RESTART_WHEN_TRUE);
    }
  }
}
