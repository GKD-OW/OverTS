import { Player } from "./variable";

export declare function wait(time: number): void;
export declare function abort(): void;
// 变量读写
export declare function getGlobal(key: string): any;
export declare function setGlobal(key: string, value: any): any;
// 玩家类
export declare function teleport(player: Player, position: Position): void;