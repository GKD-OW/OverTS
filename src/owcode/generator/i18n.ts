const locales: { [x: string]: { [x: string]: string }} = {
  'en-US': require('./locales/en-US.json'),
  'ja-JP': require('./locales/ja-JP.json'),
  'zh-CN': require('./locales/zh-CN.json'),
}

const activeLocale = 'zh-CN';

export default function i18n(k: string): string {
  return locales[activeLocale][k];
}