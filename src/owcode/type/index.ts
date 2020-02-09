import { Events } from './event';

export * from './event';
export * from './functions';
export * from './hero';
export * from './match';
export * from './variable';
export * from './constants';

export declare function runAt(event: Events): any;
export declare function condition(...conditions: boolean[]): any;
