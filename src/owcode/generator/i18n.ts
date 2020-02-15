import enUS from './locales/en-US.json';
import jaJP from './locales/ja-JP.json';
import zhCN from './locales/zh-CN.json';

const locales: { [x: string]: { [x: string]: string }} = {
  'en-US': enUS,
  'ja-JP': jaJP,
  'zh-CN': zhCN,
};
const activeLocale = 'zh-CN';

export default function i18n(k: string): string {
  return locales[activeLocale][k];
}