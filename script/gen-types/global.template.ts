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

  /**
   * 指定运行时机
   * @param event 事件
   */
  function runAt(event: Events): any;
  /**
   * 指定运行时机
   * @param event 事件
   * @param team 队伍
   * @param hero 英雄
   */
  function runAt(event: Events, team: Team, hero: Hero): any;
  /**
   * 指定规则条件
   * @param conditions 条件列表
   */
  function condition(...conditions: boolean[]): any;
  
  /**
   * 模块化导入
   * @param name 模块名称
   * @param options 模块选项
   */
  function importModule(name: string, options?: any): void;

  enum CompareSymbol {
    EQUALS = 0,
    LESS = 1, // 小于
    LESS_EQUALS = 2, // 小于或等于
    GREATER = 3, // 大于
    GREATER_EQUALS = 4, // 大于或等于
    NOT_EQUALS = 5 // 不等于
  }
}
