// Структура боя: требования босса, способности, проекты.
// Все тексты — в js/loc.js (RU/EN), здесь только механика и цифры.

export const REQUIREMENTS = [
  { id: 'core',    icon: '⚔️', color: '#57d98f', hp: 115 },
  { id: 'unity',   icon: '🧩', color: '#4fc3f7', hp: 105 },
  { id: 'balance', icon: '⚖️', color: '#ffd23f', hp: 140 },
  { id: 'econ',    icon: '💰', color: '#b58cff', hp: 120 },
  { id: 'ab',      icon: '📊', color: '#ff8a3d', hp: 95  },
  { id: 'docs',    icon: '📝', color: '#ff6ba9', hp: 110 },
];

export const ABILITIES = [
  { id: 'loop',   key: '1', target: 'core',    color: '#57d98f', cd: 2.6, dmg: 36 },
  { id: 'prefab', key: '2', target: 'unity',   color: '#4fc3f7', cd: 2.4, dmg: 38 },
  { id: 'wave',   key: '3', target: 'balance', color: '#ffd23f', cd: 3.0, dmg: 42 },
  { id: 'faucet', key: '4', target: 'econ',    color: '#b58cff', cd: 3.2, dmg: 44 },
  { id: 'abtest', key: '5', target: 'ab',      color: '#ff8a3d', cd: 11,  dmg: 34, splash: 0.6 },
  { id: 'gdd',    key: '6', target: 'docs',    color: '#ff6ba9', cd: 2.8, dmg: 40 },
];

export const BOSS = {
  name: 'HC-VACANCY',
  fireInterval: 2.8,     // сек между выстрелами босса
  fireIntervalRage: 2.1, // когда сломано >= 3 требований
  dmg: 12,               // урон по уверенности
  projectileSpeed: 310,
};

// Ссылки и проекты для инспектора
export const LINKS = {
  vacancy: 'https://highcore.io/career/detail/game-designer',
  github: 'https://github.com/Kerarty',
  cv: 'docs/CV_Yaroslav.pdf',
};

export const PROTOTYPE_REPOS = [
  { repo: 'playble-ads',            href: 'https://github.com/Kerarty/playble-ads',              key: 'proto_playads' },
  { repo: 'echoloop-playble',       href: 'https://github.com/Kerarty/echoloop-playble',         key: 'proto_echoloop' },
  { repo: 'splash-kitty-playable-ad', href: 'https://github.com/Kerarty/splash-kitty-playable-ad', key: 'proto_splash' },
  { repo: 'playable-ad-mob-rush',   href: 'https://github.com/Kerarty/playable-ad-mob-rush',     key: 'proto_mobrush' },
];
