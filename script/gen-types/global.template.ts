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

declare global {
  abstract class Player {}
  abstract class MapItem {}

  function runAt(event: Events): any;
  function runAt(event: Events, team: Team, hero: Hero): any;
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
