/**
 * @typedef {import('../data/typedefs').Boosts} Boosts
 * @typedef {import('../data/typedefs').Spread} Spread
 * @typedef {import('./ItemStateFactory').ItemState} ItemState
 * @typedef {import('./MoveStateFactory').MoveBuild} MoveBuild
 * @typedef {import('./MoveStateFactory').MoveState} MoveState
 */

const ItemStateFactory = require('./ItemStateFactory');
const MoveStateFactory = require('./MoveStateFactory');

const pokemon = require('../data/pokemon');
const natures = require('../data/natures');

/**
 * @typedef {Object} PokemonBuild
 * @property {string} name
 * @property {string} species
 * @property {'M' | 'F' | 'N'} gender
 * @property {MoveBuild[]} moves
 * @property {string} ability
 * @property {Spread} evs
 * @property {Spread} ivs
 * @property {string} item
 * @property {number} level
 * @property {boolean} shiny
 * @property {string} nature
 */

/**
 * @typedef {Object} PokemonState
 * @property {string} id
 * @property {PokemonBuild} build
 * @property {MoveState[]} moves
 * @property {string} ability
 * @property {Spread} stats
 * @property {ItemState} item
 * @property {number} hp
 * @property {number} maxhp
 * @property {Boosts} boosts
 * @property {string | null} status
 * @property {Object<string, any>} volatiles
 */

class PokemonStateFactory {
  static getStats(build) {
    /**
     * Calculates the final stats before boosts for a Pokemon.
     * @returns {Spread}
     */
    const { level, ivs, evs, nature, species } = build;
    const { baseStats } = pokemon[species];
    const stats = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    for (const key of Object.keys(baseStats)) {
      if (key === 'hp') {
        stats[key] = Math.floor((2 * baseStats[key] + ivs[key] + Math.floor(evs[key] / 4)) * level / 100) + level + 10;
      } else {
        let modifier;
        if (natures[nature].plus === key) {
          modifier = 1.1;
        } else if (natures[nature].minus === key) {
          modifier = 0.9;
        } else {
          modifier = 1;
        }
        stats[key] = Math.floor((Math.floor((2 * baseStats[key] + ivs[key] + Math.floor(evs[key] / 4)) * level / 100) + 5) * modifier);
      }
    }
    return stats;
  }


  static getMoves(build) {
    return build.moves.map(item => MoveStateFactory.create(item));
  }

  /**
   * Creates a Pokemon state from a Pokemon build.
   * @param {any} id
   * @param {PokemonBuild} build
   * @returns {PokemonState}
   */
  static create(id, build) {
    const moves = PokemonStateFactory.getMoves(build);
    const stats = PokemonStateFactory.getStats(build);
    return {
      id: `${id}: ${build.species}`,
      build,
      moves,
      ability: build.ability,
      stats,
      item: ItemStateFactory.create(build.item),
      hp: stats.hp,
      maxhp: stats.hp,
      boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 },
      status: null,
      volatiles: {},
    };
  }
}

module.exports = PokemonStateFactory;
