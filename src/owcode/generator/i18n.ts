import { default as zhCN } from './language/zh-CN';

export default function i18n(k: string): string {
  return zhCN[k];
}