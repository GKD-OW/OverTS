import * as globalthis from 'globalthis';
const globals: any = globalthis();

type Player = {};

globals.Events = {
  GLOBAL_ONGOING: 'GLOBAL_ONGOING', // 持续 - 全局
  PLAYER_ONGOING: 'PLAYER_ONGOING', // 持续 - 每名玩家
  PLAYER_ELIM: 'PLAYER_ELIM', // 玩家参与消灭
  PLAYER_FINAL_BLOW: 'PLAYER_FINAL_BLOW', // 玩家造成最后一击
  PLAYER_DEALT_DAMAGE: 'PLAYER_DEALT_DAMAGE', // 玩家造成伤害
  SUB: 'SUB' // 子程序
}

globals.Team = {
  ALL: 0,
  A: 1,
  B: 2
}

globals.Heros = {
  ALL: 0,
  MERCY: 1
}

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

  enum Team {
    ALL,
    A,
    B
  }
}

declare global {
  enum Heros {
    ALL = 0,
    MERCY = 1
  }
}

declare global {
  namespace Game {
    const isWaitingPlayers: boolean;
    const isInSetup: boolean;
  }
  namespace Constants {
    const True: boolean;
    const False: boolean;
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