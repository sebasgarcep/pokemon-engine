const PokemonStateController = require('../battle/PokemonStateController');
const pokemonData = require('./pokemon');

/**
 * @typedef {import('./typedefs').Item} Item
 */

/**
 * @type {Object<string, Item>}
 */
const items = {
  charcoal: {
    id: 'charcoal',
    name: 'Charcoal',
    num: 249,
    desc: 'Holder\'s Fire-type attacks have 1.2x power.',
    hooks: {
      onBeforeDamageCalculation: (state, entity, opts) => {
        if (
          entity.id === opts.active.id &&
          opts.move.type === 'fire'
        ) {
          opts.power *= 1.2;
        }
      },
    }
  },
  widelens: {
    id: 'widelens',
    name: 'Wide Lens',
    num: 265,
    desc: 'The accuracy of attacks by the holder is 1.1x.',
    hooks: {

    },
  },
  lifeorb: {
    id: 'lifeorb',
    name: 'Life Orb',
    num: 270,
    desc: 'Holder\'s attacks do 1.3x damage, and it loses 1/10 its max HP after the attack.',
    hooks: {
      onBeforeDamageCalculation: (state, entity, opts) => {
        if (entity.id === opts.active.id) {
          opts.power *= 1.3;
        }
      },
      onAfterAttack: (state, entity, opts) => {
        if (entity.id === opts.active.id && opts.didDamage) {
          PokemonStateController.subtractHp(entity, entity.maxhp / 10);
        }
      },
    },
  },
  focussash: {
    id: 'focussash',
    name: 'Focus Sash',
    num: 275,
    desc: 'If holder\'s HP is full, will survive an attack that would KO it with 1 HP. Single use.',
    hooks: {
      onBeforeDamageApplication: (state, entity, opts) => {
        if (
          entity.id === opts.target.id &&
          entity.item.uses === 0 &&
          entity.hp === entity.maxhp &&
          opts.damage >= entity.maxhp
        ) {
          opts.damage = entity.maxhp - 1;
        }
      },
    },
  },
  eviolite: {
    id: 'eviolite',
    name: 'Eviolite',
    num: 538,
    desc: 'If holder\'s species can evolve, its Defense and Sp. Def are 1.5x.',
    hooks: {
      onBeforeDamageCalculation: (state, entity, opts) => {
        if (
          entity.id === opts.target.id &&
          pokemonData[entity.build.species].canEvolve
        ) {
          opts.defensiveStat *= 1.5;
        }
      },
    }
  },
  assaultvest: {
    id: 'assaultvest',
    name: 'Assault Vest',
    num: 640,
    desc: 'Holder\'s Sp. Def is 1.5x, but it can only select damaging moves.',
    hooks: {
      onBeforeDamageCalculation: (state, entity, opts) => {
        if (
          entity.id === opts.target.id &&
          opts.defensiveKey === 'spd'
        ) {
          opts.defensiveStat *= 1.5;
        }
      },
    },
  },
};

module.exports = items;
