import * as globalthis from 'globalthis';
const globals: any = globalthis();

globals.CompareSymbol = {
  EQUALS: 0,
  LESS: 1, // 小于
  LESS_EQUALS: 2, // 小于或等于
  GREATER: 3, // 大于
  GREATER_EQUALS: 4, // 大于或等于
  NOT_EQUALS: 5 // 不等于
}

type Player = '_GKD_PLAYER_';
type MapItem = '_GKD_MAPITEM_';

declare global {
  function runAt(event: string): any;
  function runAt(event: string, team: Team, hero: Hero): any;
  function condition(...conditions: boolean[]): any;

  enum CompareSymbol {
    EQUALS = 0,
    LESS = 1, // 小于
    LESS_EQUALS = 2, // 小于或等于
    GREATER = 3, // 大于
    GREATER_EQUALS = 4, // 大于或等于
    NOT_EQUALS = 5 // 不等于
  }
}
