/**
 * @typedef {import('./typedefs').Pokemon} Pokemon
 */

/**
 * @type {Object<string, Pokemon>}
 */
const pokemon = {
  venusaur: {
    id: 'venusaur',
    name: 'Venusaur',
    num: 3,
    types: ['grass', 'poison'],
    baseStats: { hp: 80, atk: 82, def: 83, spa: 100, spd: 100, spe: 80 },
    height: 2,
    weight: 100,
    canEvolve: false,
  },
  torkoal: {
    id: 'torkoal',
    name: 'Torkoal',
    num: 324,
    types: ['fire'],
    baseStats: { hp: 70, atk: 85, def: 140, spa: 85, spd: 70, spe: 20 },
    height: 0.5,
    weight: 80.4,
    canEvolve: false,
  },
  dusclops: {
    id: 'dusclops',
    num: 356,
    name: 'Dusclops',
    types: ['ghost'],
    baseStats: { hp: 40, atk: 70, def: 130, spa: 60, spd: 130, spe: 25 },
    height: 1.6,
    weight: 30.6,
    canEvolve: true,
  },
  conkeldurr: {
    id: 'conkeldurr',
    name: 'Conkeldurr',
    num: 534,
    types: ['fighting'],
    baseStats: { hp: 105, atk: 140, def: 95, spa: 55, spd: 65, spe: 45 },
    height: 1.4,
    weight: 87,
    canEvolve: false,
  },
  incineroar: {
    id: 'incineroar',
    num: 727,
    name: 'Incineroar',
    types: ['fire', 'dark'],
    baseStats: { hp: 95, atk: 115, def: 90, spa: 80, spd: 90, spe: 60 },
    height: 1.8,
    weight: 83,
    canEvolve: false,
  },
  hatterene: {
    id: 'hatterene',
    num: 858,
    name: 'Hatterene',
    types: ['psychic', 'fairy'],
    baseStats: { hp: 57, atk: 90, def: 95, spa: 136, spd: 103, spe: 29 },
    height: 2.1,
    weight: 5.1,
    canEvolve: false,
  },
};

module.exports = pokemon;
