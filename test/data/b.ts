import '../src/owcode/helper';

const damage = 50;
let b = true;

namespace PlayerVariable {
  let damage_id;
}

export class ChuanHuo {
  /**
   * 传火
   * 一个玩家打另一个，就把火传过去
   */
  @runAt(Events.PLAYER_TOOK_DAMAGE)
  @condition(
    !hasStatusEffect(Game.EVENT_PLAYER, Status.BURNING),
    hasStatusEffect(Game.ATTACKER, Status.BURNING)
  )
  chuanhuo() {
    setStatusEffect(Game.EVENT_PLAYER, null, Status.BURNING, 9999);
    startDamageOverTime(Game.EVENT_PLAYER, null, 9999, damage);
    // 存到damage_id
    setPlayerVar(Game.EVENT_PLAYER, "damage_id", Game.LAST_DAMAGE_ID);
    stopDamageOverTime(playerVar(Game.ATTACKER, "damage_id"));
    clearStatusEffect(Game.ATTACKER, Status.BURNING);
  }
}
