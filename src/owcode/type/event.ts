export enum Events {
  GLOBAL_ONGOING = 'GLOBAL_ONGOING', // 持续 - 全局
  PLAYER_ONGOING = 'PLAYER_ONGOING', // 持续 - 每名玩家
  PLAYER_ELIM = 'PLAYER_ELIM', // 玩家参与消灭
  PLAYER_FINAL_BLOW = 'PLAYER_FINAL_BLOW', // 玩家造成最后一击
  PLAYER_DEALT_DAMAGE = 'PLAYER_DEALT_DAMAGE', // 玩家造成伤害
  SUB = 'SUB' // 子程序
}