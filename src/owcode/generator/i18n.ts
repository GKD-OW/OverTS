import * as enUS from './locales/en-US.json';
import * as jaJP from './locales/ja-JP.json';
import * as zhCN from './locales/zh-CN.json';

const locales: { [x: string]: { [x: string]: string }} = {
  'en-US': enUS,
  'ja-JP': jaJP,
  'zh-CN': zhCN,
};
let activeLocale = 'zh-CN';

export function setLocale(k: string) {
  if (typeof(locales[k]) === 'undefined') {
    throw new Error('Can not found locale ' + k);
  }
  activeLocale = k;
}

export default function i18n(k: string): string {
  return locales[activeLocale][k];
}