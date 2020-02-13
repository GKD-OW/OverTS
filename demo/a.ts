import '../src/owcode/helper';

let a = [];
let b = [];
let c = 0;

export class ChuanHuo {
  // 传火
  @runAt(Events.PLAYER_TOOK_DAMAGE)
  @condition(
    !hasStatusEffect(Game.EVENT_PLAYER, Status.BURNING),
    hasStatusEffect(Game.ATTACKER, Status.BURNING)
  )
  chuanhuo() {
    setStatusEffect(Game.EVENT_PLAYER, null, Status.BURNING, 9999);
    startDamageOverTime(Game.EVENT_PLAYER, null, 9999, 50);
    setPlayerVar(Game.EVENT_PLAYER, "damage_id", Game.GET_LAST_DO_T);
  }

  @runAt(Events.EACH_PLAYER, Team.ONE, Hero.ANA)
  test2() {
    wait(a[b[1]], Wait.IGNORE_CONDITION);
  }
}
