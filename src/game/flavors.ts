import type { CakeFlavor } from './types';

export const CAKE_FLAVORS: CakeFlavor[] = [
  {
    id: 'fraisier',
    nameZh: '法式草莓鮮奶油',
    nameFr: 'Fraisier Classique',
    unlockHeight: 0,
    descriptionZh: '鬆軟香草海綿夾著甜美草莓果醬，覆上雪白鮮奶油。',
    spongeTop: '#FFE4D6',
    spongeBottom: '#F5C4AE',
    fillingColor: '#E85D75',
    frostingColor: '#FFFDF9',
    frostingShadow: '#F8DFDC',
    accentColor: '#D9466E',
    sprinkleColors: ['#E85D75', '#F9A8B8', '#FFE28A'],
    toppingStyle: 'berry',
  },
  {
    id: 'pistache',
    nameZh: '開心果覆盆子',
    nameFr: 'Pistache Framboise',
    unlockHeight: 4,
    descriptionZh: '西西里開心果蛋糕體搭配酸甜覆盆子凝凍夾心。',
    spongeTop: '#DFF0D1',
    spongeBottom: '#BDD9A7',
    fillingColor: '#C83E63',
    frostingColor: '#F3FAEC',
    frostingShadow: '#D4E8C5',
    accentColor: '#6D9E52',
    sprinkleColors: ['#8CB86E', '#D9466E', '#F9E0A2'],
    toppingStyle: 'pistachio',
  },
  {
    id: 'lavande',
    nameZh: '普羅旺斯薰衣草藍莓',
    nameFr: 'Lavande Myrtille',
    unlockHeight: 8,
    descriptionZh: '淡雅薰衣草奶霜與野生藍莓果餡交織的浪漫紫韻。',
    spongeTop: '#EDE2FA',
    spongeBottom: '#D3BEF0',
    fillingColor: '#6C56A8',
    frostingColor: '#FBF8FF',
    frostingShadow: '#E3D7F5',
    accentColor: '#8367C7',
    sprinkleColors: ['#9B82DB', '#F4C6D7', '#FFFFFF'],
    toppingStyle: 'pearl',
  },
  {
    id: 'caramel',
    nameZh: '鹽之花焦糖榛果',
    nameFr: 'Caramel Beurre Salé',
    unlockHeight: 13,
    descriptionZh: '布列塔尼海鹽焦糖醬與烘烤榛果碎，溫潤濃郁。',
    spongeTop: '#F9DFB8',
    spongeBottom: '#E6BC82',
    fillingColor: '#B86A28',
    frostingColor: '#FFF6E8',
    frostingShadow: '#F0D8B6',
    accentColor: '#C4772C',
    sprinkleColors: ['#D49B38', '#8F4D1E', '#FCE6C2'],
    toppingStyle: 'caramel',
  },
  {
    id: 'citron',
    nameZh: '南法檸檬蛋白霜',
    nameFr: 'Délice au Citron',
    unlockHeight: 18,
    descriptionZh: '清新黃檸檬凝乳夾層襯托輕盈微炙蛋白霜波紋。',
    spongeTop: '#FFF4C2',
    spongeBottom: '#F5DF89',
    fillingColor: '#E5B82E',
    frostingColor: '#FFFFFA',
    frostingShadow: '#F5ECC8',
    accentColor: '#D49B38',
    sprinkleColors: ['#F4CE47', '#FFFDF5', '#B9D97A'],
    toppingStyle: 'meringue',
  },
  {
    id: 'opera',
    nameZh: '巴黎歌劇院金箔黑巧',
    nameFr: "Opéra d'Or",
    unlockHeight: 24,
    descriptionZh: '濃厚可可甘納許與咖啡酒韻，點綴璀璨金箔碎片。',
    spongeTop: '#7E544C',
    spongeBottom: '#593731',
    fillingColor: '#361F1C',
    frostingColor: '#4A2C27',
    frostingShadow: '#331D19',
    accentColor: '#D49B38',
    sprinkleColors: ['#F2C96B', '#FFE8A3', '#C98A3C'],
    toppingStyle: 'gold',
  },
];

export function getFlavorForHeight(height: number): CakeFlavor {
  let matched = CAKE_FLAVORS[0];
  for (const flavor of CAKE_FLAVORS) {
    if (height >= flavor.unlockHeight) {
      matched = flavor;
    }
  }
  return matched;
}

export function getNextFlavorForHeight(height: number): CakeFlavor | null {
  for (const flavor of CAKE_FLAVORS) {
    if (flavor.unlockHeight > height) {
      return flavor;
    }
  }
  return null;
}
