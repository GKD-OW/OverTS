import '../type/global';
import i18n from "./i18n";

const mapHeroToName: { [x: number]: string } = {
  [Heros.MERCY]: 'HERO_MERCY'
}

export function getHero(hero: Heros) {
  return i18n(mapHeroToName[hero] || 'HERO_ALL');
}