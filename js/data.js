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
  { repo: 'cv-playstrom',   href: 'https://github.com/Kerarty/cv-playstrom',   key: 'proto_playstrom' },
  { repo: 'cv-playrix',     href: 'https://github.com/Kerarty/cv-playrix',     key: 'proto_playrix' },
  { repo: 'cv-lesta',       href: 'https://github.com/Kerarty/cv-lesta',       key: 'proto_lesta' },
  { repo: 'cv-top-games',   href: 'https://github.com/Kerarty/cv-top-games',   key: 'proto_top' },
  { repo: 'cv-gametech',    href: 'https://github.com/Kerarty/cv-gametech',    key: 'proto_gametech' },
  { repo: 'cv-igrotech',    href: 'https://github.com/Kerarty/cv-igrotech',    key: 'proto_igrotech' },
  { repo: 'cv-openmygame',  href: 'https://github.com/Kerarty/cv-openmygame',  key: 'proto_openmygame' },
  { repo: 'cv-stark-games', href: 'https://github.com/Kerarty/cv-stark-games', key: 'proto_stark' },
  { repo: 'playble-ads',    href: 'https://github.com/Kerarty/playble-ads',    key: 'proto_playads' },
  { repo: 'echoloop-playble', href: 'https://github.com/Kerarty/echoloop-playble', key: 'proto_echoloop' },
];
