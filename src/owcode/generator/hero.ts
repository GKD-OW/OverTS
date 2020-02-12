import '../type/global';
import i18n from "./i18n";

export function getHero(hero: Hero) {
  return i18n('CONST_HERO_' + hero);
}