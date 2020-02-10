import { Player, Team } from "./variable";
import { Heros } from "./hero";

declare global {
  function runAt(event: string): any;
  function runAt(event: string, team: Team, hero: Heros): any;
  function condition(...conditions: boolean[]): any;

  enum Events {
    GLOBAL_ONGOING = 'GLOBAL_ONGOING', // 持续 - 全局
    PLAYER_ONGOING = 'PLAYER_ONGOING', // 持续 - 每名玩家
    PLAYER_ELIM = 'PLAYER_ELIM', // 玩家参与消灭
    PLAYER_FINAL_BLOW = 'PLAYER_FINAL_BLOW', // 玩家造成最后一击
    PLAYER_DEALT_DAMAGE = 'PLAYER_DEALT_DAMAGE', // 玩家造成伤害
    SUB = 'SUB' // 子程序
  }
}

declare global {
  function wait(time: number): void;
  function abort(): void;
  // 变量读写
  function getGlobal(key: string): any;
  function setGlobal(key: string, value: any): any;
  // 玩家类
  function teleport(player: Player, position: Position): void;
}