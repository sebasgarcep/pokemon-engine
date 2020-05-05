const pokemon = require('../data/pokemon');
const natures = require('../data/natures');

class PokemonStateFactory {
  static getStats(build) {
    const { level, ivs, evs, nature, species } = build;
    const { baseStats } = pokemon[species];
    const stats = {};
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
    return build.moves.map(item => ({
      id: item.id,
      pp: item.pp,
      maxpp: item.pp,
      disabled: false,
    }));
  }

  static create(id, build) {
    const moves = PokemonStateFactory.getMoves(build);
    const stats = PokemonStateFactory.getStats(build);
    return {
      id: `${id}: ${build.species}`,
      build,
      moves,
      ability: build.ability,
      stats,
      item: { id: build.item, uses: 0 },
      hp: stats.hp,
      maxhp: stats.hp,
      boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 },
      status: null,
      volatiles: {},
    };
  }
}

module.exports = PokemonStateFactory;
